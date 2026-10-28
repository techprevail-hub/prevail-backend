
import supabase from "../../services/supabaseClient.js";

import {
  validateSessionId,
  validateSessionDate,
  validateTimeRange,
  validateStatus,
  validateCancelReason,
  validateNotes,
} from "../../validations/role-coach/session.validation.js";

/* -------------------------------------------------------------------------- */
/* SHARED HELPERS — ALSO USED BY booking.service.js                            */
/* -------------------------------------------------------------------------- */

export const toMinutes = (time) => {
  if (typeof time !== "string") return null;

  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

export const overlaps = (startA, endA, startB, endB) => {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);

  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null)) {
    return false;
  }

  return aStart < bEnd && aEnd > bStart;
};

export const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const isValidCalendarDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

export const formatSession = (session) => ({
  id: session.id,
  coachId: session.coach_id,
  seekerId: session.seeker_id,
  serviceId: session.service_id,
  sessionDate: session.session_date,
  startTime: session.start_time,
  endTime: session.end_time,
  timezone: session.timezone,
  durationMinutes: session.duration_minutes,
  serviceName: session.service_name,
  sessionType: session.session_type,
  price: session.price,
  currency: session.currency,
  status: session.status,
  paymentStatus: session.payment_status,
  meetingUrl: session.meeting_url,
  cancellationReason: session.cancellation_reason,
  coachNotes: session.coach_notes,
  createdAt: session.created_at,
  updatedAt: session.updated_at,
});

/* -------------------------------------------------------------------------- */
/* COACH AVAILABILITY CHECK                                                    */
/* -------------------------------------------------------------------------- */

export const checkCoachAvailability = async ({
  coachId,
  sessionDate,
  startTime,
  endTime,
}) => {
  if (!isValidCalendarDate(sessionDate)) {
    throw createError("Invalid session date.");
  }

  const requestedStart = toMinutes(startTime);
  const requestedEnd = toMinutes(endTime);

  if (
    requestedStart === null ||
    requestedEnd === null ||
    requestedStart >= requestedEnd
  ) {
    throw createError("Invalid session time range.");
  }

  const dayOfWeek = new Date(
    `${sessionDate}T00:00:00.000Z`
  ).getUTCDay();

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
    throw createError("Coach is unavailable on this date.", 409);
  }

  const overlapsBlockedTime = blockedOverrides.some((item) =>
    overlaps(startTime, endTime, item.start_time, item.end_time)
  );

  if (overlapsBlockedTime) {
    throw createError("Selected time overlaps a blocked period.", 409);
  }

  let availabilityWindows = [];

  if (availableOverrides.length > 0) {
    availabilityWindows = availableOverrides.filter(
      (item) => item.start_time && item.end_time
    );
  } else {
    const { data, error } = await supabase
      .from("coach_availability")
      .select("start_time, end_time, valid_from, valid_until")
      .eq("coach_id", coachId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (error) throw error;

    availabilityWindows = (data || []).filter((item) => {
      if (item.valid_from && sessionDate < item.valid_from) return false;
      if (item.valid_until && sessionDate > item.valid_until) return false;
      return true;
    });
  }

  const fitsAvailability = availabilityWindows.some((window) => {
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

  if (!fitsAvailability) {
    throw createError("Selected time is outside coach availability.", 409);
  }
};

/* -------------------------------------------------------------------------- */
/* SESSION CONFLICT CHECK                                                      */
/* -------------------------------------------------------------------------- */

export const checkSessionConflict = async ({
  coachId,
  sessionDate,
  startTime,
  endTime,
  excludeSessionId = null,
}) => {
  const { data, error } = await supabase
    .from("coach_sessions")
    .select("id, start_time, end_time, status")
    .eq("coach_id", coachId)
    .eq("session_date", sessionDate)
    .in("status", ["pending", "confirmed"]);

  if (error) throw error;

  const conflict = (data || []).some((session) => {
    if (excludeSessionId && session.id === excludeSessionId) {
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
    throw createError("This time slot is already booked.", 409);
  }
};

/* -------------------------------------------------------------------------- */
/* GET COACH SESSIONS                                                          */
/* -------------------------------------------------------------------------- */

export const getCoachSessionsService = async ({
  coachId,
  status = null,
}) => {
  if (!coachId) {
    throw createError("Coach ID is required.");
  }

  let query = supabase
    .from("coach_sessions")
    .select("*")
    .eq("coach_id", coachId)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (status) {
    validateStatus(status);
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    sessions: (data || []).map(formatSession),
  };
};

/* -------------------------------------------------------------------------- */
/* GET SINGLE COACH SESSION                                                    */
/* -------------------------------------------------------------------------- */

export const getCoachSessionByIdService = async ({
  coachId,
  sessionId,
}) => {
  if (!coachId) throw createError("Coach ID is required.");

  validateSessionId(sessionId);

  const { data, error } = await supabase
    .from("coach_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw createError("Session not found.", 404);
  }

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* ACCEPT / REJECT / UPDATE SESSION STATUS                                     */
/* -------------------------------------------------------------------------- */


export const updateCoachSessionStatusService = async ({
  coachId,
  sessionId,
  status,
  reason = null,
}) => {
  validateSessionId(sessionId);
  validateStatus(status);

  const existing = await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
  };

  const allowed = allowedTransitions[existing.status] || [];

  if (!allowed.includes(status)) {
    throw createError(
      `Cannot change session status from "${existing.status}" to "${status}".`,
      409
    );
  }

  // A cancellation reason is optional, but if supplied it must be valid.
  let cancellationReason = null;

  if (status === "cancelled" && reason !== null && reason !== undefined) {
    validateCancelReason(reason);

    if (typeof reason !== "string" || !reason.trim()) {
      throw createError("Cancellation reason cannot be empty.");
    }

    cancellationReason = reason.trim();
  }

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "cancelled") {
    updatePayload.cancellation_reason = cancellationReason;
  }

  const { data, error } = await supabase
    .from("coach_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select("*")
    .single();

  if (error) throw error;

  return formatSession(data);
};


/* -------------------------------------------------------------------------- */
/* RESCHEDULE SESSION                                                          */
/* -------------------------------------------------------------------------- */

export const rescheduleCoachSessionService = async ({
  coachId,
  sessionId,
  sessionDate,
  startTime,
  endTime,
}) => {
  validateSessionId(sessionId);
  validateSessionDate(sessionDate);
  validateTimeRange(startTime, endTime);

  const existing = await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  if (["cancelled", "completed", "no_show"].includes(existing.status)) {
    throw createError("This session cannot be rescheduled.", 409);
  }

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes
  ) {
    throw createError("Invalid session time range.");
  }

  await checkCoachAvailability({
    coachId,
    sessionDate,
    startTime,
    endTime,
  });

  await checkSessionConflict({
    coachId,
    sessionDate,
    startTime,
    endTime,
    excludeSessionId: sessionId,
  });

  const { data, error } = await supabase
    .from("coach_sessions")
    .update({
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: endMinutes - startMinutes,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select("*")
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* CANCEL SESSION                                                              */
/* -------------------------------------------------------------------------- */

export const cancelCoachSessionService = async ({
  coachId,
  sessionId,
  reason,
}) => {
  validateSessionId(sessionId);
  validateCancelReason(reason);

  const existing = await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  if (["completed", "no_show"].includes(existing.status)) {
    throw createError(
      "Completed or no-show sessions cannot be cancelled.",
      409
    );
  }

  if (existing.status === "cancelled") {
    throw createError("Session is already cancelled.", 409);
  }

  const { data, error } = await supabase
    .from("coach_sessions")
    .update({
      status: "cancelled",
      cancellation_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select("*")
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* GET SESSION NOTES                                                           */
/* -------------------------------------------------------------------------- */

export const getCoachSessionNotesService = async ({
  coachId,
  sessionId,
}) => {
  const session = await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  return {
    sessionId,
    notes: session.coachNotes || "",
  };
};

/* -------------------------------------------------------------------------- */
/* UPDATE SESSION NOTES                                                        */
/* -------------------------------------------------------------------------- */

export const updateCoachSessionNotesService = async ({
  coachId,
  sessionId,
  notes,
}) => {
  validateSessionId(sessionId);
  validateNotes(notes);

  await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  const { data, error } = await supabase
    .from("coach_sessions")
    .update({
      coach_notes: notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select("*")
    .single();

  if (error) throw error;

  return formatSession(data);
};
