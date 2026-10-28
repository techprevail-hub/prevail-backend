
import supabase from "../../services/supabaseClient.js";

import {
  createError,
  toMinutes,
  overlaps,
  isValidCalendarDate,
  formatSession,
  enrichSessionWithSeekerDetails,
  checkCoachAvailability,
  checkSessionConflict,
} from "../role-coach/session.service.js";

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

  // Verify coach.
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
    .select("id, coach_id, duration_minutes, is_active")
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
    throw createError("Service duration is invalid.");
  }

  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  // Get date-specific availability overrides.
  const { data: overrides, error: overrideError } = await supabase
    .from("coach_availability_overrides")
    .select("*")
    .eq("coach_id", coachId)
    .eq("override_date", date);

  if (overrideError) throw overrideError;

  const dateOverrides = overrides || [];

  const availableOverrides = dateOverrides.filter(
    (item) => item.override_type === "available"
  );

  const blockedOverrides = dateOverrides.filter(
    (item) => item.override_type === "blocked"
  );

  // A blocked override without a time range blocks the entire day.
  const fullDayBlocked = blockedOverrides.some(
    (item) => !item.start_time || !item.end_time
  );

  if (fullDayBlocked) {
    return {
      coachId,
      serviceId,
      date,
      durationMinutes: duration,
      timezone: dateOverrides.find((item) => item.timezone)?.timezone || "UTC",
      slots: [],
    };
  }

  let availabilityWindows = [];

  // Date-specific available windows take precedence over weekly availability.
  if (availableOverrides.length > 0) {
    availabilityWindows = availableOverrides
      .filter((item) => item.start_time && item.end_time)
      .map((item) => ({
        start_time: item.start_time,
        end_time: item.end_time,
        timezone: item.timezone || "UTC",
      }));
  } else {
    const { data: weeklyAvailability, error: availabilityError } =
      await supabase
        .from("coach_availability")
        .select(
          "start_time, end_time, timezone, valid_from, valid_until"
        )
        .eq("coach_id", coachId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

    if (availabilityError) throw availabilityError;

    availabilityWindows = (weeklyAvailability || [])
      .filter((item) => {
        if (item.valid_from && date < item.valid_from) return false;
        if (item.valid_until && date > item.valid_until) return false;
        return true;
      })
      .map((item) => ({
        start_time: item.start_time,
        end_time: item.end_time,
        timezone: item.timezone || "UTC",
      }));
  }

  if (availabilityWindows.length === 0) {
    return {
      coachId,
      serviceId,
      date,
      durationMinutes: duration,
      timezone: "UTC",
      slots: [],
    };
  }

  const timezone = availabilityWindows[0].timezone || "UTC";

  // Get today's date and time in the coach's timezone.
  let nowParts;

  try {
    nowParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
  } catch {
    throw createError("Invalid coach availability timezone.");
  }

  const parts = Object.fromEntries(
    nowParts.map(({ type, value }) => [type, value])
  );

  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const currentMinutes =
    Number(parts.hour) * 60 + Number(parts.minute);

  if (date < today) {
    return {
      coachId,
      serviceId,
      date,
      durationMinutes: duration,
      timezone,
      slots: [],
    };
  }

  // Fetch existing bookings.
  const { data: bookedSessions, error: sessionsError } = await supabase
    .from("coach_sessions")
    .select("start_time, end_time, status")
    .eq("coach_id", coachId)
    .eq("session_date", date)
    .in("status", ["pending", "confirmed"]);

  if (sessionsError) throw sessionsError;

  const sessions = bookedSessions || [];
  const slots = [];
  const seenSlots = new Set();

  const formatTime = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60
    ).padStart(2, "0")}`;

  for (const window of availabilityWindows) {
    const windowStart = toMinutes(window.start_time);
    const windowEnd = toMinutes(window.end_time);

    if (
      windowStart === null ||
      windowEnd === null ||
      windowStart >= windowEnd
    ) {
      continue;
    }

    // Generate consecutive slots using the service duration.
    for (
      let start = windowStart;
      start + duration <= windowEnd;
      start += duration
    ) {
      const end = start + duration;
      const startTime = formatTime(start);
      const endTime = formatTime(end);

      // Skip slots overlapping blocked periods.
      const isBlocked = blockedOverrides.some((item) =>
        overlaps(
          startTime,
          endTime,
          item.start_time,
          item.end_time
        )
      );

      if (isBlocked) continue;

      // Skip slots overlapping pending or confirmed bookings.
      const isBooked = sessions.some((session) =>
        overlaps(
          startTime,
          endTime,
          session.start_time,
          session.end_time
        )
      );

      if (isBooked) continue;

      // Do not show slots that have already passed.
      if (date === today && start <= currentMinutes) continue;

      const slotKey = `${startTime}-${endTime}`;

      if (seenSlots.has(slotKey)) continue;
      seenSlots.add(slotKey);

      slots.push({
        startTime,
        endTime,
        available: true,
      });
    }
  }

  slots.sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
  );

  return {
    coachId,
    serviceId,
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

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || "")) {
    throw createError("startTime must be in HH:mm format.");
  }

  const startMinutes = toMinutes(startTime);

  // Verify the coach.
  const { data: coach, error: coachError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle();

  if (coachError) throw coachError;

  if (!coach || coach.role !== "coach") {
    throw createError("Coach not found.", 404);
  }

  // Verify that the service belongs to the coach and is active.
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

  if (endMinutes >= 24 * 60) {
    throw createError(
      "The session must end before midnight on the selected date."
    );
  }

  const formatTimeWithSeconds = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60
    ).padStart(2, "0")}:00`;

  const normalizedStartTime = `${startTime}:00`;
  const endTime = formatTimeWithSeconds(endMinutes);

  const servicePrice = service.is_free ? 0 : Number(service.price);

  if (!Number.isFinite(servicePrice) || servicePrice < 0) {
    throw createError("The selected service has an invalid price.");
  }

  // Use the supplied timezone or UTC as a fallback.
  const bookingTimezone = timezone || "UTC";

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

  const todayInTimezone = `${parts.year}-${parts.month}-${parts.day}`;

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

  // Validate availability again at booking time.
  await checkCoachAvailability({
    coachId,
    sessionDate,
    startTime: normalizedStartTime,
    endTime,
  });

  // Recheck conflicts so an already-booked slot is rejected.
  await checkSessionConflict({
    coachId,
    sessionDate,
    startTime: normalizedStartTime,
    endTime,
  });

  // Create booking with pending status.
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

  // Return booking together with seeker and institute information.
  return enrichSessionWithSeekerDetails(session);
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
      (data || []).map(enrichSessionWithSeekerDetails)
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

  return enrichSessionWithSeekerDetails(data);
};
