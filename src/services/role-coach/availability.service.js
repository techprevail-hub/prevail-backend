
import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toMinutes = (time) => {
  if (typeof time !== "string") return null;

  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

const validateTimeRange = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (start === null || end === null || start >= end) {
    throw createError("Please provide a valid start and end time.");
  }
};

const validateDayOfWeek = (dayOfWeek) => {
  if (
    !Number.isInteger(Number(dayOfWeek)) ||
    Number(dayOfWeek) < 0 ||
    Number(dayOfWeek) > 6
  ) {
    throw createError("dayOfWeek must be a number between 0 and 6.");
  }
};

const validateCapacity = (capacity) => {
  const parsed = Number(capacity);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError("Capacity must be a positive whole number.");
  }

  return parsed;
};

const formatAvailability = (item, serviceName = null) => ({
  id: item.id,
  coachId: item.coach_id,
  serviceId: item.service_id || null,
  serviceName,
  dayOfWeek: item.day_of_week,
  startTime: item.start_time,
  endTime: item.end_time,
  timezone: item.timezone,
  capacity: Number(item.capacity) || 10,
  isActive: item.is_active,
  validFrom: item.valid_from || null,
  validUntil: item.valid_until || null,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const formatOverride = (item) => ({
  id: item.id,
  coachId: item.coach_id,
  overrideDate: item.override_date,
  startTime: item.start_time,
  endTime: item.end_time,
  overrideType: item.override_type,
  timezone: item.timezone,
  note: item.note,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

/* -------------------------------------------------------------------------- */
/* VERIFY COACH SERVICE                                                       */
/* -------------------------------------------------------------------------- */

const verifyCoachService = async ({ coachId, serviceId }) => {
  if (!serviceId) {
    throw createError("Please select a service.");
  }

  const { data: service, error } = await supabase
    .from("coach_services")
    .select("id, coach_id, name, is_active")
    .eq("id", serviceId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (error) throw error;

  if (!service || !service.is_active) {
    throw createError(
      "Selected service was not found or is inactive.",
      404
    );
  }

  return service;
};

/* -------------------------------------------------------------------------- */
/* CHECK WEEKLY AVAILABILITY OVERLAP                                          */
/* -------------------------------------------------------------------------- */

/*
 * Keep this check coach-wide, not service-specific.
 *
 * This prevents a coach from creating:
 * Monday 12-1 PM -> C Programming
 * Monday 12-1 PM -> Python
 *
 * Different services cannot occupy the same coach time.
 */

const checkWeeklyOverlap = async ({
  coachId,
  dayOfWeek,
  startTime,
  endTime,
  excludeId = null,
}) => {
  let query = supabase
    .from("coach_availability")
    .select("id")
    .eq("coach_id", coachId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1);

  if (error) throw error;

  if (data?.length) {
    throw createError(
      "This time overlaps with another active availability slot for this coach.",
      409
    );
  }
};

/* -------------------------------------------------------------------------- */
/* CHECK DATE-SPECIFIC OVERRIDE OVERLAP                                       */
/* -------------------------------------------------------------------------- */

const checkOverrideOverlap = async ({
  coachId,
  overrideDate,
  startTime,
  endTime,
  excludeId = null,
}) => {
  let query = supabase
    .from("coach_availability_overrides")
    .select("id")
    .eq("coach_id", coachId)
    .eq("override_date", overrideDate)
    .eq("override_type", "available")
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1);

  if (error) throw error;

  if (data?.length) {
    throw createError(
      "This override overlaps with an existing available override.",
      409
    );
  }
};

/* -------------------------------------------------------------------------- */
/* WEEKLY AVAILABILITY                                                        */
/* -------------------------------------------------------------------------- */

/**
 * GET COACH WEEKLY AVAILABILITY
 *
 * Returns serviceId, serviceName and capacity.
 */
export const getCoachAvailabilityService = async ({ coachId }) => {
  const { data, error } = await supabase
    .from("coach_availability")
    .select("*")
    .eq("coach_id", coachId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  const availability = data || [];

  const serviceIds = [
    ...new Set(
      availability
        .map((item) => item.service_id)
        .filter(Boolean)
    ),
  ];

  let serviceMap = {};

  if (serviceIds.length > 0) {
    const { data: services, error: serviceError } = await supabase
      .from("coach_services")
      .select("id, name")
      .eq("coach_id", coachId)
      .in("id", serviceIds);

    if (serviceError) throw serviceError;

    serviceMap = Object.fromEntries(
      (services || []).map((service) => [
        service.id,
        service.name,
      ])
    );
  }

  return availability.map((item) =>
    formatAvailability(
      item,
      serviceMap[item.service_id] || null
    )
  );
};

/* -------------------------------------------------------------------------- */
/* CREATE WEEKLY AVAILABILITY                                                  */
/* -------------------------------------------------------------------------- */

export const createCoachAvailabilityService = async ({
  coachId,
  serviceId,
  dayOfWeek,
  startTime,
  endTime,
  timezone = "Asia/Kolkata",
  capacity = 10,
}) => {
  validateDayOfWeek(dayOfWeek);
  validateTimeRange(startTime, endTime);

  const parsedDay = Number(dayOfWeek);
  const parsedCapacity = validateCapacity(capacity);

  const service = await verifyCoachService({
    coachId,
    serviceId,
  });

  await checkWeeklyOverlap({
    coachId,
    dayOfWeek: parsedDay,
    startTime,
    endTime,
  });

  const { data, error } = await supabase
    .from("coach_availability")
    .insert({
      coach_id: coachId,
      service_id: service.id,
      day_of_week: parsedDay,
      start_time: startTime,
      end_time: endTime,
      timezone,
      capacity: parsedCapacity,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return formatAvailability(data, service.name);
};

/* -------------------------------------------------------------------------- */
/* UPDATE WEEKLY AVAILABILITY                                                  */
/* -------------------------------------------------------------------------- */

export const updateCoachAvailabilityService = async ({
  availabilityId,
  coachId,
  serviceId,
  dayOfWeek,
  startTime,
  endTime,
  timezone,
  capacity,
}) => {
  const { data: existing, error: existingError } = await supabase
    .from("coach_availability")
    .select("*")
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    throw createError("Availability slot not found.", 404);
  }

  const nextServiceId = serviceId || existing.service_id;

  if (!nextServiceId) {
    throw createError(
      "This availability has no assigned service. Please select a service."
    );
  }

  const nextDay =
    dayOfWeek !== undefined ? Number(dayOfWeek) : existing.day_of_week;

  const nextStart = startTime || existing.start_time;
  const nextEnd = endTime || existing.end_time;

  const nextTimezone = timezone || existing.timezone || "Asia/Kolkata";

  const nextCapacity =
    capacity !== undefined
      ? validateCapacity(capacity)
      : Number(existing.capacity) || 10;

  validateDayOfWeek(nextDay);
  validateTimeRange(nextStart, nextEnd);

  const service = await verifyCoachService({
    coachId,
    serviceId: nextServiceId,
  });

  if (existing.is_active) {
    await checkWeeklyOverlap({
      coachId,
      dayOfWeek: nextDay,
      startTime: nextStart,
      endTime: nextEnd,
      excludeId: availabilityId,
    });
  }

  const { data, error } = await supabase
    .from("coach_availability")
    .update({
      service_id: service.id,
      day_of_week: nextDay,
      start_time: nextStart,
      end_time: nextEnd,
      timezone: nextTimezone,
      capacity: nextCapacity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  return formatAvailability(data, service.name);
};

/* -------------------------------------------------------------------------- */
/* TOGGLE WEEKLY AVAILABILITY                                                  */
/* -------------------------------------------------------------------------- */

export const toggleCoachAvailabilityService = async ({
  availabilityId,
  coachId,
  isActive,
}) => {
  if (typeof isActive !== "boolean") {
    throw createError("isActive must be a boolean.");
  }

  const { data: slot, error: fetchError } = await supabase
    .from("coach_availability")
    .select("*")
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!slot) {
    throw createError("Availability slot not found.", 404);
  }

  if (isActive) {
    await checkWeeklyOverlap({
      coachId,
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      excludeId: availabilityId,
    });
  }

  const { data, error } = await supabase
    .from("coach_availability")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  return formatAvailability(data);
};

/* -------------------------------------------------------------------------- */
/* DELETE WEEKLY AVAILABILITY                                                  */
/* -------------------------------------------------------------------------- */

export const deleteCoachAvailabilityService = async ({
  availabilityId,
  coachId,
}) => {
  const { data, error } = await supabase
    .from("coach_availability")
    .delete()
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    throw createError("Availability slot not found.", 404);
  }

  return formatAvailability(data);
};

/* -------------------------------------------------------------------------- */
/* DATE OVERRIDES                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Date overrides remain coach-wide:
 * - available = extra/custom availability
 * - blocked = unavailable time or full day
 *
 * We are not adding service_id to this existing table.
 */

export const getCoachOverridesService = async ({
  coachId,
  fromDate,
  toDate,
}) => {
  let query = supabase
    .from("coach_availability_overrides")
    .select("*")
    .eq("coach_id", coachId)
    .order("override_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (fromDate) {
    query = query.gte("override_date", fromDate);
  }

  if (toDate) {
    query = query.lte("override_date", toDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(formatOverride);
};

/* -------------------------------------------------------------------------- */
/* CREATE DATE-SPECIFIC OVERRIDE                                              */
/* -------------------------------------------------------------------------- */

export const createCoachOverrideService = async ({
  coachId,
  overrideDate,
  startTime = null,
  endTime = null,
  overrideType,
  timezone = "Asia/Kolkata",
  note = null,
}) => {
  if (!["available", "blocked"].includes(overrideType)) {
    throw createError("overrideType must be available or blocked.");
  }

  if (overrideType === "available") {
    validateTimeRange(startTime, endTime);

    await checkOverrideOverlap({
      coachId,
      overrideDate,
      startTime,
      endTime,
    });
  }

  const { data, error } = await supabase
    .from("coach_availability_overrides")
    .insert({
      coach_id: coachId,
      override_date: overrideDate,
      start_time: overrideType === "available" ? startTime : null,
      end_time: overrideType === "available" ? endTime : null,
      override_type: overrideType,
      timezone,
      note: note || null,
    })
    .select()
    .single();

  if (error) throw error;

  return formatOverride(data);
};

/* -------------------------------------------------------------------------- */
/* UPDATE DATE-SPECIFIC OVERRIDE                                              */
/* -------------------------------------------------------------------------- */

export const updateCoachOverrideService = async ({
  overrideId,
  coachId,
  overrideDate,
  startTime = null,
  endTime = null,
  overrideType,
  timezone,
  note,
}) => {
  const { data: existing, error: existingError } = await supabase
    .from("coach_availability_overrides")
    .select("*")
    .eq("id", overrideId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    throw createError("Availability override not found.", 404);
  }

  const nextDate = overrideDate || existing.override_date;
  const nextType = overrideType || existing.override_type;

  const nextStart =
    startTime !== undefined ? startTime : existing.start_time;

  const nextEnd =
    endTime !== undefined ? endTime : existing.end_time;

  if (!["available", "blocked"].includes(nextType)) {
    throw createError("overrideType must be available or blocked.");
  }

  if (nextType === "available") {
    validateTimeRange(nextStart, nextEnd);

    await checkOverrideOverlap({
      coachId,
      overrideDate: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      excludeId: overrideId,
    });
  }

  const updateData = {
    override_date: nextDate,
    start_time: nextType === "available" ? nextStart : null,
    end_time: nextType === "available" ? nextEnd : null,
    override_type: nextType,
    ...(timezone !== undefined && { timezone }),
    ...(note !== undefined && { note }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("coach_availability_overrides")
    .update(updateData)
    .eq("id", overrideId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  return formatOverride(data);
};

/* -------------------------------------------------------------------------- */
/* DELETE DATE-SPECIFIC OVERRIDE                                              */
/* -------------------------------------------------------------------------- */

export const deleteCoachOverrideService = async ({
  overrideId,
  coachId,
}) => {
  const { data, error } = await supabase
    .from("coach_availability_overrides")
    .delete()
    .eq("id", overrideId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    throw createError("Availability override not found.", 404);
  }

  return formatOverride(data);
};
