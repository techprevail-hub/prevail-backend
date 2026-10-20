
const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const NOTIFICATION_KEYS = [
  "newBooking",
  "bookingCancellation",
  "sessionReminder",
  "paymentUpdates",
  "newReview",
  "platformUpdates",
];

const NOTIFICATION_CHANNELS = ["email", "inApp"];

const SESSION_RANGES = {
  defaultDurationMinutes: [15, 240],
  bufferMinutes: [0, 120],
  minimumNoticeHours: [0, 720],
};

/* -------------------------------------------------------------------------- */
/* NOTIFICATION VALIDATION                                                    */
/* -------------------------------------------------------------------------- */

export const validateNotificationSettings = (body) => {
  const errors = [];

  if (!isPlainObject(body) || Object.keys(body).length === 0) {
    errors.push("Provide at least one notification preference.");
    return errors;
  }

  for (const [channel, preferences] of Object.entries(body)) {
    if (!NOTIFICATION_CHANNELS.includes(channel)) {
      errors.push(`Unsupported notification channel: ${channel}`);
      continue;
    }

    if (!isPlainObject(preferences) ||
        Object.keys(preferences).length === 0) {
      errors.push(`${channel} must be a non-empty object.`);
      continue;
    }

    for (const [key, value] of Object.entries(preferences)) {
      if (!NOTIFICATION_KEYS.includes(key)) {
        errors.push(`Unsupported notification setting: ${channel}.${key}`);
      } else if (typeof value !== "boolean") {
        errors.push(`${channel}.${key} must be a boolean.`);
      }
    }
  }

  return errors;
};

/* -------------------------------------------------------------------------- */
/* SESSION PREFERENCES VALIDATION                                             */
/* -------------------------------------------------------------------------- */

export const validateSessionPreferences = (body) => {
  const errors = [];

  if (!isPlainObject(body) || Object.keys(body).length === 0) {
    errors.push("Provide at least one session preference.");
    return errors;
  }

  for (const [key, value] of Object.entries(body)) {
    const range = SESSION_RANGES[key];

    if (!range) {
      errors.push(`Unsupported session preference: ${key}`);
      continue;
    }

    if (
      !Number.isInteger(value) ||
      value < range[0] ||
      value > range[1]
    ) {
      errors.push(
        `${key} must be an integer between ${range[0]} and ${range[1]}.`
      );
    }
  }

  return errors;
};

/* -------------------------------------------------------------------------- */
/* GENERAL PREFERENCES VALIDATION                                             */
/* -------------------------------------------------------------------------- */

export const validateGeneralPreferences = (body) => {
  const errors = [];

  if (!isPlainObject(body) || Object.keys(body).length === 0) {
    errors.push("Provide at least one general preference.");
    return errors;
  }

  for (const [key, value] of Object.entries(body)) {
    if (key === "language") {
      if (
        typeof value !== "string" ||
        !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value)
      ) {
        errors.push(
          "language must be a valid language code, such as en or en-US."
        );
      }

      continue;
    }

    if (key === "timezone") {
      if (typeof value !== "string" || value.trim() === "") {
        errors.push("timezone must be a non-empty IANA time zone.");
        continue;
      }

      try {
        new Intl.DateTimeFormat("en-US", {
          timeZone: value,
        }).format();
      } catch {
        errors.push("timezone must be a valid IANA time zone.");
      }

      continue;
    }

    errors.push(`Unsupported general preference: ${key}`);
  }

  return errors;
};
