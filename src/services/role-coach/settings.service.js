
import supabase from "../../services/supabaseClient.js";

/* -------------------------------------------------------------------------- */
/* DEFAULT SETTINGS                                                           */
/* -------------------------------------------------------------------------- */

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: {
    newBooking: true,
    bookingCancellation: true,
    sessionReminder: true,
    paymentUpdates: true,
    newReview: true,
    platformUpdates: false,
  },
  inApp: {
    newBooking: true,
    bookingCancellation: true,
    sessionReminder: true,
    paymentUpdates: true,
    newReview: true,
    platformUpdates: true,
  },
};

export const DEFAULT_SESSION_PREFERENCES = {
  defaultDurationMinutes: 60,
  bufferMinutes: 10,
  minimumNoticeHours: 24,
};

export const DEFAULT_GENERAL_PREFERENCES = {
  language: "en",
  timezone: "Asia/Kolkata",
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mergePreferences = (current = {}, updates = {}) => {
  const result = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] !== null &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = {
        ...result[key],
        ...value,
      };
    } else {
      result[key] = value;
    }
  }

  return result;
};

const getOrCreateSettings = async (coachId) => {
  if (!coachId) {
    throw createError("Coach ID is required", 400);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("coach_settings")
    .select("*")
    .eq("coach_id", coachId)
    .maybeSingle();

  if (fetchError) {
    throw createError(fetchError.message, 500);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createErrorResult } = await supabase
    .from("coach_settings")
    .upsert(
      {
        coach_id: coachId,
        notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        session_preferences: DEFAULT_SESSION_PREFERENCES,
        general_preferences: DEFAULT_GENERAL_PREFERENCES,
      },
      { onConflict: "coach_id" }
    )
    .select("*")
    .single();

  if (createErrorResult) {
    throw createError(createErrorResult.message, 500);
  }

  return created;
};

const updateSettings = async (coachId, column, preferences) => {
  const { data, error } = await supabase
    .from("coach_settings")
    .update({
      [column]: preferences,
      updated_at: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .select("*")
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  return data;
};

/* -------------------------------------------------------------------------- */
/* GET COACH SETTINGS                                                         */
/* -------------------------------------------------------------------------- */

export const getCoachSettingsService = async ({ coachId }) => {
  return getOrCreateSettings(coachId);
};

/* -------------------------------------------------------------------------- */
/* UPDATE NOTIFICATION PREFERENCES                                            */
/* -------------------------------------------------------------------------- */

export const updateCoachNotificationSettingsService = async ({
  coachId,
  updates,
}) => {
  const current = await getOrCreateSettings(coachId);

  const notificationPreferences = mergePreferences(
    current.notification_preferences ||
      DEFAULT_NOTIFICATION_PREFERENCES,
    updates
  );

  return updateSettings(
    coachId,
    "notification_preferences",
    notificationPreferences
  );
};

/* -------------------------------------------------------------------------- */
/* UPDATE SESSION PREFERENCES                                                 */
/* -------------------------------------------------------------------------- */

export const updateCoachSessionPreferencesService = async ({
  coachId,
  updates,
}) => {
  const current = await getOrCreateSettings(coachId);

  const sessionPreferences = {
    ...(current.session_preferences || DEFAULT_SESSION_PREFERENCES),
    ...updates,
  };

  return updateSettings(
    coachId,
    "session_preferences",
    sessionPreferences
  );
};

/* -------------------------------------------------------------------------- */
/* UPDATE GENERAL PREFERENCES                                                 */
/* -------------------------------------------------------------------------- */

export const updateCoachGeneralPreferencesService = async ({
  coachId,
  updates,
}) => {
  const current = await getOrCreateSettings(coachId);

  const generalPreferences = {
    ...(current.general_preferences || DEFAULT_GENERAL_PREFERENCES),
    ...updates,
  };

  return updateSettings(
    coachId,
    "general_preferences",
    generalPreferences
  );
};
