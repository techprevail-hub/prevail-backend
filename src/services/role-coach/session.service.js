// src/services/role-coach/session.service.js

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
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const toMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const overlaps = (
  startA,
  endA,
  startB,
  endB
) => {
  return (
    toMinutes(startA) < toMinutes(endB) &&
    toMinutes(endA) > toMinutes(startB)
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

  cancellationReason:
    session.cancellation_reason,

  coachNotes: session.coach_notes,

  createdAt: session.created_at,
  updatedAt: session.updated_at,
});

/* -------------------------------------------------------------------------- */
/* Availability check                                                         */
/* -------------------------------------------------------------------------- */

const checkCoachAvailability = async ({
  coachId,
  sessionDate,
  startTime,
  endTime,
}) => {
  const date = new Date(
    `${sessionDate}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    const error = new Error(
      "Invalid session date"
    );
    error.statusCode = 400;
    throw error;
  }

  const dayOfWeek = date.getDay();

  /* Get date overrides first */
  const { data: overrides, error: overrideError } =
    await supabase
      .from("coach_availability_overrides")
      .select("*")
      .eq("coach_id", coachId)
      .eq("override_date", sessionDate);

  if (overrideError) {
    throw overrideError;
  }

  const blocked = (overrides || []).some(
    (item) =>
      item.override_type === "blocked"
  );

  if (blocked) {
    const error = new Error(
      "Coach is unavailable on this date"
    );
    error.statusCode = 409;
    throw error;
  }

  const availableOverrides =
    (overrides || []).filter(
      (item) =>
        item.override_type === "available"
    );

  let slots = [];

  /* Date-specific availability overrides weekly availability */
  if (availableOverrides.length) {
    slots = availableOverrides.map(
      (item) => ({
        start_time: item.start_time,
        end_time: item.end_time,
      })
    );
  } else {
    const { data, error } =
      await supabase
        .from("coach_availability")
        .select(
          "start_time,end_time,valid_from,valid_until,is_active"
        )
        .eq("coach_id", coachId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

    if (error) {
      throw error;
    }

    slots = (data || []).filter((slot) => {
      if (
        slot.valid_from &&
        sessionDate < slot.valid_from
      ) {
        return false;
      }

      if (
        slot.valid_until &&
        sessionDate > slot.valid_until
      ) {
        return false;
      }

      return true;
    });
  }

  const fitsAvailability = slots.some(
    (slot) =>
      toMinutes(startTime) >=
        toMinutes(
          slot.start_time
        ) &&
      toMinutes(endTime) <=
        toMinutes(
          slot.end_time
        )
  );

  if (!fitsAvailability) {
    const error = new Error(
      "Selected time is outside coach availability"
    );
    error.statusCode = 409;
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* Session conflict                                                           */
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
    .select(
      "id,start_time,end_time,status"
    )
    .eq("coach_id", coachId)
    .eq("session_date", sessionDate)
    .in("status", [
      "pending",
      "confirmed",
    ]);

  if (error) {
    throw error;
  }

  const conflict = (data || []).some(
    (session) => {
      if (
        excludeSessionId &&
        session.id === excludeSessionId
      ) {
        return false;
      }

      return overlaps(
        startTime,
        endTime,
        session.start_time,
        session.end_time
      );
    }
  );

  if (conflict) {
    const error = new Error(
      "This time slot is already booked"
    );
    error.statusCode = 409;
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* Get sessions                                                               */
/* -------------------------------------------------------------------------- */

export const getCoachSessionsService = async ({
  coachId,
  status = null,
}) => {
  if (!coachId) {
    const error = new Error(
      "Coach ID is required"
    );
    error.statusCode = 400;
    throw error;
  }

  let query = supabase
    .from("coach_sessions")
    .select("*")
    .eq("coach_id", coachId)
    .order("session_date", {
      ascending: true,
    })
    .order("start_time", {
      ascending: true,
    });

  if (status) {
    validateStatus(status);
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    sessions: (data || []).map(
      formatSession
    ),
  };
};

/* -------------------------------------------------------------------------- */
/* Get single session                                                         */
/* -------------------------------------------------------------------------- */

export const getCoachSessionByIdService =
  async ({
    coachId,
    sessionId,
  }) => {
    validateSessionId(sessionId);

    const { data, error } =
      await supabase
        .from("coach_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("coach_id", coachId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const error = new Error(
        "Session not found"
      );
      error.statusCode = 404;
      throw error;
    }

    return formatSession(data);
  };

/* -------------------------------------------------------------------------- */
/* Update status                                                              */
/* -------------------------------------------------------------------------- */

export const updateCoachSessionStatusService =
  async ({
    coachId,
    sessionId,
    status,
  }) => {
    validateSessionId(sessionId);
    validateStatus(status);

    const existing =
      await getCoachSessionByIdService({
        coachId,
        sessionId,
      });

    if (
      existing.status === "cancelled" &&
      status !== "cancelled"
    ) {
      const error = new Error(
        "Cancelled session cannot be changed"
      );
      error.statusCode = 409;
      throw error;
    }

    if (
      existing.status === "completed" &&
      status !== "completed"
    ) {
      const error = new Error(
        "Completed session cannot be changed"
      );
      error.statusCode = 409;
      throw error;
    }

    const { data, error } =
      await supabase
        .from("coach_sessions")
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("coach_id", coachId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return formatSession(data);
  };

/* -------------------------------------------------------------------------- */
/* Reschedule                                                                */
/* -------------------------------------------------------------------------- */

export const rescheduleCoachSessionService =
  async ({
    coachId,
    sessionId,
    sessionDate,
    startTime,
    endTime,
  }) => {
    validateSessionId(sessionId);
    validateSessionDate(sessionDate);
    validateTimeRange(
      startTime,
      endTime
    );

    const existing =
      await getCoachSessionByIdService({
        coachId,
        sessionId,
      });

    if (
      ["cancelled", "completed"].includes(
        existing.status
      )
    ) {
      const error = new Error(
        "This session cannot be rescheduled"
      );
      error.statusCode = 409;
      throw error;
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
      toMinutes(endTime) -
      toMinutes(startTime);

    const { data, error } =
      await supabase
        .from("coach_sessions")
        .update({
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes:
            durationMinutes,
          status: "confirmed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("coach_id", coachId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return formatSession(data);
  };

/* -------------------------------------------------------------------------- */
/* Cancel                                                                     */
/* -------------------------------------------------------------------------- */

export const cancelCoachSessionService =
  async ({
    coachId,
    sessionId,
    reason,
  }) => {
    validateSessionId(sessionId);
    validateCancelReason(reason);

    const existing =
      await getCoachSessionByIdService({
        coachId,
        sessionId,
      });

    if (existing.status === "completed") {
      const error = new Error(
        "Completed session cannot be cancelled"
      );
      error.statusCode = 409;
      throw error;
    }

    if (existing.status === "cancelled") {
      const error = new Error(
        "Session is already cancelled"
      );
      error.statusCode = 409;
      throw error;
    }

    const { data, error } =
      await supabase
        .from("coach_sessions")
        .update({
          status: "cancelled",
          cancellation_reason:
            reason.trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("coach_id", coachId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return formatSession(data);
  };

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

export const getCoachSessionNotesService =
  async ({
    coachId,
    sessionId,
  }) => {
    const session =
      await getCoachSessionByIdService({
        coachId,
        sessionId,
      });

    return {
      sessionId,
      notes: session.coachNotes || "",
    };
  };

export const updateCoachSessionNotesService =
  async ({
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

    const { data, error } =
      await supabase
        .from("coach_sessions")
        .update({
          coach_notes:
            notes.trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("coach_id", coachId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return formatSession(data);
  };