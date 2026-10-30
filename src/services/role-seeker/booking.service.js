
import supabase from "../../services/supabaseClient.js";

import {
  createError,
  toMinutes,
  overlaps,
  isValidCalendarDate,
  enrichSessionWithSeekerDetails,
} from "../role-coach/session.service.js";

/* -------------------------------------------------------------------------- */
/* SHARED HELPERS                                                             */
/* -------------------------------------------------------------------------- */

const formatTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;

const formatTimeWithSeconds = (minutes) =>
  `${formatTime(minutes)}:00`;

const getTimezoneParts = (timezone) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    return Object.fromEntries(
      parts.map(({ type, value }) => [type, value])
    );
  } catch {
    throw createError(
      "Invalid timezone. Use a valid IANA timezone such as Asia/Kolkata."
    );
  }
};

const getTodayAndCurrentMinutes = (timezone) => {
  const parts = getTimezoneParts(timezone);

  return {
    today: `${parts.year}-${parts.month}-${parts.day}`,
    currentMinutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const validateTime = (time) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) {
    throw createError("Time must be in HH:mm format.");
  }
};

const getBookingWithGroupDetails = async (session) => {
  if (!session) return null;

  const enriched = await enrichSessionWithSeekerDetails(session);

  if (!session.group_session_id) {
    return {
      ...enriched,
      groupSessionId: null,
      meetingUrl: session.meeting_url || null,
      groupSessionStatus: null,
      groupCapacity: null,
    };
  }

  const { data: groupSession, error } = await supabase
    .from("coach_group_sessions")
    .select("id, meeting_url, status, capacity")
    .eq("id", session.group_session_id)
    .maybeSingle();

  if (error) throw error;

  return {
    ...enriched,
    groupSessionId: session.group_session_id,
    meetingUrl:
      groupSession?.meeting_url || session.meeting_url || null,
    groupSessionStatus: groupSession?.status || null,
    groupCapacity: groupSession?.capacity ?? null,
  };
};

const getServiceAndCoach = async ({ coachId, serviceId }) => {
  const { data: coach, error: coachError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle();

  if (coachError) throw coachError;

  if (!coach || coach.role !== "coach") {
    throw createError("Coach not found.", 404);
  }

  const { data: service, error: serviceError } = await supabase
    .from("coach_services")
    .select(
      "id, coach_id, name, session_type, duration_minutes, price, currency, is_free, is_active"
    )
    .eq("id", serviceId)
    .eq("coach_id", coachId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError) throw serviceError;

  if (!service) {
    throw createError("Active service not found for this coach.", 404);
  }

  const duration = Number(service.duration_minutes);

  if (!Number.isInteger(duration) || duration <= 0) {
    throw createError("The selected service has an invalid duration.");
  }

  return { coach, service, duration };
};

/*
 * Get service-specific availability windows.
 *
 * Weekly availability is filtered by service_id.
 * Date-specific available overrides continue to take precedence,
 * matching the existing availability behavior.
 *
 * Overrides are currently coach-wide because your existing
 * coach_availability_overrides table has not been shown with service_id.
 */

const getServiceAvailabilityWindows = async ({
  coachId,
  serviceId,
  sessionDate,
  dayOfWeek,
}) => {
  const { data: overrides, error: overrideError } = await supabase
    .from("coach_availability_overrides")
    .select("*")
    .eq("coach_id", coachId)
    .eq("override_date", sessionDate);

  if (overrideError) throw overrideError;

  const dateOverrides = overrides || [];

  const availableOverrides = dateOverrides.filter(
    (item) => item.override_type === "available"
  );

  const blockedOverrides = dateOverrides.filter(
    (item) => item.override_type === "blocked"
  );

  const fullDayBlocked = blockedOverrides.some(
    (item) => !item.start_time || !item.end_time
  );

  if (fullDayBlocked) {
    return {
      windows: [],
      blockedOverrides,
      timezone:
        dateOverrides.find((item) => item.timezone)?.timezone || null,
      fullDayBlocked: true,
    };
  }

  if (availableOverrides.length > 0) {
    return {
      windows: availableOverrides
        .filter((item) => item.start_time && item.end_time)
        .map((item) => ({
          start_time: item.start_time,
          end_time: item.end_time,
          timezone: item.timezone || "UTC",
          capacity: Number(item.capacity) || 10,
        })),
      blockedOverrides,
      timezone:
        availableOverrides.find((item) => item.timezone)?.timezone ||
        "UTC",
      fullDayBlocked: false,
    };
  }

  const { data: weeklyAvailability, error: availabilityError } =
    await supabase
      .from("coach_availability")
      .select(
        "id, service_id, start_time, end_time, timezone, valid_from, valid_until, capacity"
      )
      .eq("coach_id", coachId)
      .eq("service_id", serviceId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

  if (availabilityError) throw availabilityError;

  const validWindows = (weeklyAvailability || [])
    .filter((item) => {
      if (item.valid_from && sessionDate < item.valid_from) return false;
      if (item.valid_until && sessionDate > item.valid_until) return false;
      return true;
    })
    .map((item) => ({
      availabilityId: item.id,
      start_time: item.start_time,
      end_time: item.end_time,
      timezone: item.timezone || "UTC",
      capacity: Number(item.capacity) || 10,
    }));

  return {
    windows: validWindows,
    blockedOverrides,
    timezone: validWindows[0]?.timezone || "UTC",
    fullDayBlocked: false,
  };
};

const isInsideAvailability = ({
  startTime,
  endTime,
  windows,
}) => {
  const requestedStart = toMinutes(startTime);
  const requestedEnd = toMinutes(endTime);

  return windows.some((window) => {
    const windowStart = toMinutes(window.start_time);
    const windowEnd = toMinutes(window.end_time);

    return (
      windowStart !== null &&
      windowEnd !== null &&
      windowStart < windowEnd &&
      requestedStart >= windowStart &&
      requestedEnd <= windowEnd
    );
  });
};

const isBlockedByOverride = ({
  startTime,
  endTime,
  blockedOverrides,
}) =>
  blockedOverrides.some((item) =>
    overlaps(
      startTime,
      endTime,
      item.start_time,
      item.end_time
    )
  );

/*
 * A different service must not overlap the requested time.
 * The same group service and exact time is allowed.
 *
 * Legacy bookings without group_session_id continue to block
 * overlapping times, so existing individual bookings are protected.
 */

const checkBookingConflict = async ({
  coachId,
  serviceId,
  sessionDate,
  startTime,
  endTime,
  isGroup,
}) => {
  const { data: sessions, error } = await supabase
    .from("coach_sessions")
    .select(
      "id, service_id, start_time, end_time, status, group_session_id, session_type"
    )
    .eq("coach_id", coachId)
    .eq("session_date", sessionDate)
    .in("status", ["pending", "confirmed"]);

  if (error) throw error;

  const conflict = (sessions || []).some((session) => {
    const sameExactSlot =
      session.service_id === serviceId &&
      toMinutes(session.start_time) === toMinutes(startTime) &&
      toMinutes(session.end_time) === toMinutes(endTime);

    // Allow only an existing group booking for this exact service/time.
    if (
      isGroup &&
      sameExactSlot &&
      session.session_type === "group" &&
      session.group_session_id
    ) {
      return false;
    }

    return overlaps(
      startTime,
      endTime,
      session.start_time,
      session.end_time
    );
  });

  if (conflict) {
    throw createError(
      "This time overlaps another booking or service. Please select another slot.",
      409
    );
  }
};

/* -------------------------------------------------------------------------- */
/* GET AVAILABLE SLOTS                                                        */
/* -------------------------------------------------------------------------- */

export const getAvailableSlotsService = async ({
  coachId,
  serviceId,
  date,
}) => {
  if (!coachId || !serviceId) {
    throw createError("Coach ID and service ID are required.");
  }

  if (!isValidCalendarDate(date)) {
    throw createError("date must be a valid YYYY-MM-DD date.");
  }

  const { service, duration } = await getServiceAndCoach({
    coachId,
    serviceId,
  });

  const dayOfWeek = new Date(
    `${date}T00:00:00.000Z`
  ).getUTCDay();

  const availability = await getServiceAvailabilityWindows({
    coachId,
    serviceId,
    sessionDate: date,
    dayOfWeek,
  });

  if (availability.fullDayBlocked || availability.windows.length === 0) {
    return {
      coachId,
      serviceId,
      serviceName: service.name,
      sessionType: service.session_type,
      date,
      durationMinutes: duration,
      timezone: availability.timezone || "UTC",
      slots: [],
    };
  }

  const timezone = availability.timezone || "UTC";

  const { today, currentMinutes } =
    getTodayAndCurrentMinutes(timezone);

  if (date < today) {
    return {
      coachId,
      serviceId,
      serviceName: service.name,
      sessionType: service.session_type,
      date,
      durationMinutes: duration,
      timezone,
      slots: [],
    };
  }

  const { data: bookedSessions, error: sessionsError } =
    await supabase
      .from("coach_sessions")
      .select(
        "id, service_id, start_time, end_time, status, group_session_id, session_type"
      )
      .eq("coach_id", coachId)
      .eq("session_date", date)
      .in("status", ["pending", "confirmed"]);

  if (sessionsError) throw sessionsError;

  const { data: groupSessions, error: groupError } =
    await supabase
      .from("coach_group_sessions")
      .select("id, service_id, start_time, end_time, capacity, status")
      .eq("coach_id", coachId)
      .eq("service_id", serviceId)
      .eq("session_date", date)
      .eq("status", "scheduled");

  if (groupError) throw groupError;

  const { data: bookingCounts, error: countError } =
    await supabase
      .from("coach_sessions")
      .select("group_session_id")
      .eq("coach_id", coachId)
      .eq("service_id", serviceId)
      .eq("session_date", date)
      .in("status", ["pending", "confirmed"])
      .not("group_session_id", "is", null);

  if (countError) throw countError;

  const countByGroup = (bookingCounts || []).reduce((acc, booking) => {
    acc[booking.group_session_id] =
      (acc[booking.group_session_id] || 0) + 1;
    return acc;
  }, {});

  const slots = [];
  const seenSlots = new Set();

  for (const window of availability.windows) {
    const windowStart = toMinutes(window.start_time);
    const windowEnd = toMinutes(window.end_time);

    if (
      windowStart === null ||
      windowEnd === null ||
      windowStart >= windowEnd
    ) {
      continue;
    }

    for (
      let start = windowStart;
      start + duration <= windowEnd;
      start += duration
    ) {
      const end = start + duration;
      const startTime = formatTime(start);
      const endTime = formatTime(end);

      if (
        isBlockedByOverride({
          startTime,
          endTime,
          blockedOverrides: availability.blockedOverrides,
        })
      ) {
        continue;
      }

      if (date === today && start <= currentMinutes) {
        continue;
      }

      const slotKey = `${startTime}-${endTime}`;

      if (seenSlots.has(slotKey)) continue;

      /*
       * Check overlapping bookings.
       * Same-service group bookings at the exact time are allowed.
       * Different services and legacy individual bookings block the slot.
       */

      const conflictingSession = (bookedSessions || []).some((session) => {
        const sameExactGroupSlot =
          session.service_id === serviceId &&
          session.session_type === "group" &&
          session.group_session_id &&
          toMinutes(session.start_time) === start &&
          toMinutes(session.end_time) === end;

        if (sameExactGroupSlot) return false;

        return overlaps(
          startTime,
          endTime,
          session.start_time,
          session.end_time
        );
      });

      if (conflictingSession) continue;

      const matchingGroup = (groupSessions || []).find(
        (group) =>
          toMinutes(group.start_time) === start &&
          toMinutes(group.end_time) === end
      );

      const capacity =
        matchingGroup?.capacity || window.capacity || 10;

      const bookedCount = matchingGroup
        ? countByGroup[matchingGroup.id] || 0
        : 0;

      const remainingSeats = Math.max(
        0,
        Number(capacity) - bookedCount
      );

      if (remainingSeats <= 0) continue;

      seenSlots.add(slotKey);

      slots.push({
        availabilityId: window.availabilityId || null,
        groupSessionId: matchingGroup?.id || null,
        startTime,
        endTime,
        capacity,
        bookedCount,
        remainingSeats,
        available: true,
      });
    }
  }

  slots.sort(
    (a, b) =>
      toMinutes(a.startTime) - toMinutes(b.startTime)
  );

  return {
    coachId,
    serviceId,
    serviceName: service.name,
    sessionType: service.session_type,
    date,
    durationMinutes: duration,
    timezone,
    slots,
  };
};

/* -------------------------------------------------------------------------- */
/* CREATE JOB SEEKER / STUDENT BOOKING                                        */
/* -------------------------------------------------------------------------- */

export const createSeekerBookingService = async ({
  seekerId,
  coachId,
  serviceId,
  sessionDate,
  startTime,
  timezone,
}) => {
  if (!seekerId || !coachId || !serviceId) {
    throw createError("Seeker, coach, and service are required.");
  }

  if (!isValidCalendarDate(sessionDate)) {
    throw createError("sessionDate must be a valid YYYY-MM-DD date.");
  }

  validateTime(startTime);

  const { service, duration } = await getServiceAndCoach({
    coachId,
    serviceId,
  });

  const startMinutes = toMinutes(startTime);
  const endMinutes = startMinutes + duration;

  if (endMinutes >= 24 * 60) {
    throw createError(
      "The session must end before midnight on the selected date."
    );
  }

  const normalizedStartTime = formatTimeWithSeconds(startMinutes);
  const endTime = formatTimeWithSeconds(endMinutes);

  const bookingTimezone = timezone || "Asia/Kolkata";

  const { today, currentMinutes } =
    getTodayAndCurrentMinutes(bookingTimezone);

  if (sessionDate < today) {
    throw createError("You cannot book a session in the past.");
  }

  if (sessionDate === today && startMinutes <= currentMinutes) {
    throw createError(
      "You cannot book a session at a time that has already passed."
    );
  }

  const dayOfWeek = new Date(
    `${sessionDate}T00:00:00.000Z`
  ).getUTCDay();

  const availability = await getServiceAvailabilityWindows({
    coachId,
    serviceId,
    sessionDate,
    dayOfWeek,
  });

  if (availability.fullDayBlocked) {
    throw createError("Coach is unavailable on this date.", 409);
  }

  if (
    !isInsideAvailability({
      startTime: normalizedStartTime,
      endTime,
      windows: availability.windows,
    })
  ) {
    throw createError(
      "Selected time is not available for this service.",
      409
    );
  }

  if (
    isBlockedByOverride({
      startTime: normalizedStartTime,
      endTime,
      blockedOverrides: availability.blockedOverrides,
    })
  ) {
    throw createError(
      "Selected time overlaps a blocked period.",
      409
    );
  }

  const isGroup = service.session_type === "group";

  await checkBookingConflict({
    coachId,
    serviceId,
    sessionDate,
    startTime: normalizedStartTime,
    endTime,
    isGroup,
  });

  const servicePrice = service.is_free
    ? 0
    : Number(service.price);

  if (!Number.isFinite(servicePrice) || servicePrice < 0) {
    throw createError("The selected service has an invalid price.");
  }

  const matchingWindow = availability.windows.find((window) => {
    const windowStart = toMinutes(window.start_time);
    const windowEnd = toMinutes(window.end_time);

    return (
      windowStart !== null &&
      windowEnd !== null &&
      startMinutes >= windowStart &&
      endMinutes <= windowEnd
    );
  });

  const capacity = matchingWindow?.capacity || 10;

  let session;

  if (isGroup) {
    /*
     * IMPORTANT:
     * This RPC must be created in Supabase before group booking works.
     * It atomically creates/reuses the group session, checks capacity,
     * and inserts the booking.
     */

    const { data, error } = await supabase.rpc(
      "create_group_booking",
      {
        p_seeker_id: seekerId,
        p_coach_id: coachId,
        p_service_id: service.id,
        p_session_date: sessionDate,
        p_start_time: normalizedStartTime,
        p_end_time: endTime,
        p_timezone: bookingTimezone,
        p_duration_minutes: duration,
        p_service_name: service.name,
        p_session_type: service.session_type,
        p_price: servicePrice,
        p_currency: service.currency || "INR",
        p_capacity: capacity,
      }
    );

    if (error) {
      if (
        error.message?.includes("GROUP_CAPACITY_REACHED")
      ) {
        throw createError(
          "This group session is full. Please select another time.",
          409
        );
      }

      if (
        error.message?.includes("GROUP_SESSION_CONFLICT")
      ) {
        throw createError(
          "This time is already reserved for another service.",
          409
        );
      }

      console.error("Group booking RPC error:", error);
      throw createError(
        error.message || "Failed to create group booking.",
        500
      );
    }

    session = data;
  } else {
    /*
     * Individual services continue to create separate bookings.
     * They do not share a group session or meeting URL.
     */

    const { data, error } = await supabase
      .from("coach_sessions")
      .insert({
        coach_id: coachId,
        seeker_id: seekerId,
        service_id: service.id,
        session_date: sessionDate,
        start_time: normalizedStartTime,
        end_time: endTime,
        timezone: bookingTimezone,
        duration_minutes: duration,
        service_name: service.name,
        session_type: service.session_type,
        price: servicePrice,
        currency: service.currency || "INR",
        status: "pending",
        payment_status: "pending",
      })
      .select("*")
      .single();

    if (error) throw error;

    session = data;
  }

  if (!session?.id) {
    throw createError("Booking was created but no booking data was returned.", 500);
  }

  return getBookingWithGroupDetails(session);
};

/* -------------------------------------------------------------------------- */
/* GET JOB SEEKER BOOKINGS                                                    */
/* -------------------------------------------------------------------------- */

export const getSeekerBookingsService = async ({
  seekerId,
  status = null,
}) => {
  if (!seekerId) {
    throw createError("Seeker ID is required.");
  }

  let query = supabase
    .from("coach_sessions")
    .select("*")
    .eq("seeker_id", seekerId)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (status) {
    const allowedStatuses = [
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
    ];

    if (!allowedStatuses.includes(status)) {
      throw createError("Invalid booking status.");
    }

    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    bookings: await Promise.all(
      (data || []).map(getBookingWithGroupDetails)
    ),
  };
};

/* -------------------------------------------------------------------------- */
/* GET SINGLE JOB SEEKER BOOKING                                              */
/* -------------------------------------------------------------------------- */

export const getSeekerBookingByIdService = async ({
  seekerId,
  bookingId,
}) => {
  if (!seekerId || !bookingId) {
    throw createError("Seeker ID and booking ID are required.");
  }

  const { data, error } = await supabase
    .from("coach_sessions")
    .select("*")
    .eq("id", bookingId)
    .eq("seeker_id", seekerId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw createError("Booking not found.", 404);
  }

  return getBookingWithGroupDetails(data);
};
