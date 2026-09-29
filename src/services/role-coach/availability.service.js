// src/services/role-coach/availability.service.js

import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatAvailability = (item) => ({
  id: item.id,
  coachId: item.coach_id,
  dayOfWeek: item.day_of_week,
  startTime: item.start_time,
  endTime: item.end_time,
  timezone: item.timezone,
  isActive: item.is_active,
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

/**
 * Check whether a weekly availability slot overlaps
 * with another active slot.
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
    const error = new Error(
      "This availability slot overlaps with an existing slot"
    );
    error.statusCode = 409;
    throw error;
  }
};

/**
 * Check whether a date-specific available slot overlaps
 * with another available slot.
 */
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
    const error = new Error(
      "This override overlaps with an existing slot"
    );
    error.statusCode = 409;
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* WEEKLY AVAILABILITY                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Get coach weekly availability
 */
export const getCoachAvailabilityService = async ({
  coachId,
}) => {
  const { data, error } = await supabase
    .from("coach_availability")
    .select("*")
    .eq("coach_id", coachId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(formatAvailability);
};

/**
 * Create weekly availability slot
 */
export const createCoachAvailabilityService = async ({
  coachId,
  dayOfWeek,
  startTime,
  endTime,
  timezone = "UTC",
}) => {
  await checkWeeklyOverlap({
    coachId,
    dayOfWeek,
    startTime,
    endTime,
  });

  const { data, error } = await supabase
    .from("coach_availability")
    .insert({
      coach_id: coachId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      timezone,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return formatAvailability(data);
};

/**
 * Update weekly availability slot
 */
export const updateCoachAvailabilityService = async ({
  availabilityId,
  coachId,
  dayOfWeek,
  startTime,
  endTime,
  timezone,
}) => {
  await checkWeeklyOverlap({
    coachId,
    dayOfWeek,
    startTime,
    endTime,
    excludeId: availabilityId,
  });

  const { data, error } = await supabase
    .from("coach_availability")
    .update({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", availabilityId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    const error = new Error(
      "Availability slot not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return formatAvailability(data);
};

/**
 * Toggle weekly availability
 */
export const toggleCoachAvailabilityService = async ({
  availabilityId,
  coachId,
  isActive,
}) => {
  if (isActive) {
    const { data: slot, error: fetchError } = await supabase
      .from("coach_availability")
      .select("day_of_week, start_time, end_time")
      .eq("id", availabilityId)
      .eq("coach_id", coachId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!slot) {
      const error = new Error(
        "Availability slot not found"
      );
      error.statusCode = 404;
      throw error;
    }

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

  if (!data) {
    const error = new Error(
      "Availability slot not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return formatAvailability(data);
};

/**
 * Delete weekly availability
 */
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
    const error = new Error(
      "Availability slot not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return formatAvailability(data);
};

/* -------------------------------------------------------------------------- */
/* DATE OVERRIDES                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Get coach date-specific overrides
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

/**
 * Create date-specific override
 *
 * overrideType:
 * - available = extra/custom availability
 * - blocked   = completely unavailable
 */
export const createCoachOverrideService = async ({
  coachId,
  overrideDate,
  startTime = null,
  endTime = null,
  overrideType,
  timezone = "UTC",
  note = null,
}) => {
  if (overrideType === "available") {
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
      start_time:
        overrideType === "available"
          ? startTime
          : null,
      end_time:
        overrideType === "available"
          ? endTime
          : null,
      override_type: overrideType,
      timezone,
      note: note || null,
    })
    .select()
    .single();

  if (error) throw error;

  return formatOverride(data);
};

/**
 * Update date-specific override
 */
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
  if (overrideType === "available") {
    await checkOverrideOverlap({
      coachId,
      overrideDate,
      startTime,
      endTime,
      excludeId: overrideId,
    });
  }

  const updateData = {
    override_date: overrideDate,
    start_time:
      overrideType === "available"
        ? startTime
        : null,
    end_time:
      overrideType === "available"
        ? endTime
        : null,
    override_type: overrideType,
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

  if (!data) {
    const error = new Error(
      "Availability override not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return formatOverride(data);
};

/**
 * Delete date-specific override
 */
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
    const error = new Error(
      "Availability override not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return formatOverride(data);
};