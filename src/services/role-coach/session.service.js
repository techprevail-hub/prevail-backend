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
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const toMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const overlaps = (startA, endA, startB, endB) => {
  return (
    toMinutes(startA) < toMinutes(endB) &&
    toMinutes(endA) > toMinutes(startB)
  );
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidCalendarDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

const formatSession = (session) => ({
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
/* AVAILABILITY CHECK                                                         */
/* -------------------------------------------------------------------------- */

const checkCoachAvailability = async ({
  coachId,
  sessionDate,
  startTime,
  endTime,
}) => {
  if (!isValidCalendarDate(sessionDate)) {
    throw createError("Invalid session date.");
  }

  // Assumes day_of_week uses Sunday = 0 through Saturday = 6.
  const date = new Date(`${sessionDate}T00:00:00.000Z`);
  const dayOfWeek = date.getUTCDay();

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

  // A blocked override with no time range blocks the entire date.
  const fullDayBlocked = blockedOverrides.some(
    (item) => !item.start_time || !item.end_time
  );

  if (fullDayBlocked) {
    throw createError("Coach is unavailable on this date.", 409);
  }

  // A timed blocked override rejects a booking that overlaps it.
  const overlapsBlockedTime = blockedOverrides.some((item) =>
    overlaps(startTime, endTime, item.start_time, item.end_time)
  );

  if (overlapsBlockedTime) {
    throw createError(
      "Selected time overlaps a blocked period.",
      409
    );
  }

  let slots = [];

  if (availableOverrides.length > 0) {
    slots = availableOverrides.filter(
      (item) => item.start_time && item.end_time
    );
  } else {
    const { data, error } = await supabase
      .from("coach_availability")
      .select(
        "start_time,end_time,valid_from,valid_until,is_active"
      )
      .eq("coach_id", coachId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (error) throw error;

    slots = (data || []).filter((slot) => {
      if (slot.valid_from && sessionDate < slot.valid_from) {
        return false;
      }

      if (slot.valid_until && sessionDate > slot.valid_until) {
        return false;
      }

      return true;
    });
  }

  const requestedStart = toMinutes(startTime);
  const requestedEnd = toMinutes(endTime);

  const fitsAvailability = slots.some((slot) => {
    const slotStart = toMinutes(slot.start_time);
    const slotEnd = toMinutes(slot.end_time);

    return (
      slotStart !== null &&
      slotEnd !== null &&
      requestedStart >= slotStart &&
      requestedEnd <= slotEnd
    );
  });

  if (!fitsAvailability) {
    throw createError(
      "Selected time is outside coach availability.",
      409
    );
  }
};

/* -------------------------------------------------------------------------- */
/* SESSION CONFLICT                                                           */
/* -------------------------------------------------------------------------- */

const checkSessionConflict = async ({
  coachId,
  sessionDate,
  startTime,
  endTime,
  excludeSessionId = null,
}) => {
  const { data, error } = await supabase
    .from("coach_sessions")
    .select("id,start_time,end_time,status")
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
/* GET COACH SESSIONS                                                         */
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
/* GET SINGLE SESSION                                                         */
/* -------------------------------------------------------------------------- */

export const getCoachSessionByIdService = async ({
  coachId,
  sessionId,
}) => {
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
/* UPDATE SESSION STATUS                                                     */
/* -------------------------------------------------------------------------- */

export const updateCoachSessionStatusService = async ({
  coachId,
  sessionId,
  status,
}) => {
  validateSessionId(sessionId);
  validateStatus(status);

  const existing = await getCoachSessionByIdService({
    coachId,
    sessionId,
  });

  if (existing.status === "cancelled") {
    throw createError("Cancelled session cannot be changed.", 409);
  }

  if (existing.status === "completed") {
    throw createError("Completed session cannot be changed.", 409);
  }

  if (existing.status === "no_show") {
    throw createError("No-show session cannot be changed.", 409);
  }

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

  const { data, error } = await supabase
    .from("coach_sessions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* RESCHEDULE SESSION                                                         */
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

  const durationMinutes =
    toMinutes(endTime) - toMinutes(startTime);

  const { data, error } = await supabase
    .from("coach_sessions")
    .update({
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* CANCEL SESSION                                                             */
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

  if (existing.status === "completed") {
    throw createError("Completed session cannot be cancelled.", 409);
  }

  if (existing.status === "no_show") {
    throw createError("No-show session cannot be cancelled.", 409);
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
    .select()
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* SESSION NOTES                                                              */
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
    .select()
    .single();

  if (error) throw error;

  return formatSession(data);
};

/* -------------------------------------------------------------------------- */
/* CREATE JOB SEEKER BOOKING                                                  */
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
    throw createError("Coach, service, and seeker are required.");
  }

  if (!isValidCalendarDate(sessionDate)) {
    throw createError(
      "sessionDate must be a valid YYYY-MM-DD date."
    );
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || "")) {
    throw createError("startTime must be in HH:mm format.");
  }

  const startMinutes = toMinutes(startTime);

  // Verify coach account.
  const { data: coach, error: coachError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle();

  if (coachError) throw coachError;

  if (!coach || coach.role !== "coach") {
    throw createError("Coach not found.", 404);
  }

  // Verify active service belongs to this coach.
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
    throw createError(
      "This service is unavailable for the selected coach.",
      404
    );
  }

  const duration = Number(service.duration_minutes);

  if (!Number.isInteger(duration) || duration <= 0) {
    throw createError("The selected service has an invalid duration.");
  }

  const endMinutes = startMinutes + duration;

  if (endMinutes > 24 * 60) {
    throw createError("The session must end on the same day.");
  }

  const formatTime = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60
    ).padStart(2, "0")}:00`;

  const normalizedStartTime = `${startTime}:00`;
  const endTime = formatTime(endMinutes);

  const bookingTimezone = timezone || "UTC";

  // Validate timezone and obtain current local date/time.
  let nowParts;

  try {
    nowParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: bookingTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
  } catch {
    throw createError(
      "Invalid timezone. Use a valid IANA timezone such as Asia/Kolkata."
    );
  }

  const parts = Object.fromEntries(
    nowParts.map(({ type, value }) => [type, value])
  );

  const todayInTimezone =
    `${parts.year}-${parts.month}-${parts.day}`;

  if (sessionDate < todayInTimezone) {
    throw createError("You cannot book a session in the past.");
  }

  if (sessionDate === todayInTimezone) {
    const currentMinutes =
      Number(parts.hour) * 60 + Number(parts.minute);

    if (startMinutes <= currentMinutes) {
      throw createError(
        "You cannot book a session at a time that has already passed."
      );
    }
  }

  const servicePrice = service.is_free
    ? 0
    : Number(service.price);

  if (!Number.isFinite(servicePrice) || servicePrice < 0) {
    throw createError("The selected service has an invalid price.");
  }

  await checkCoachAvailability({
    coachId,
    sessionDate,
    startTime: normalizedStartTime,
    endTime,
  });

  await checkSessionConflict({
    coachId,
    sessionDate,
    startTime: normalizedStartTime,
    endTime,
  });

  const { data: session, error: insertError } = await supabase
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
      currency: service.currency,
      status: "pending",
      payment_status: "pending",
    })
    .select("*")
    .single();

  if (insertError) throw insertError;

  return formatSession(session);
};