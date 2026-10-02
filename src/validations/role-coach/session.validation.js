// src/validations/role-coach/session.validation.js

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const validateSessionId = (sessionId) => {
  if (!sessionId) {
    const error = new Error("Session ID is required");
    error.statusCode = 400;
    throw error;
  }
};

export const validateSessionDate = (date) => {
  if (!date || !DATE_REGEX.test(date)) {
    const error = new Error(
      "sessionDate must be in YYYY-MM-DD format"
    );
    error.statusCode = 400;
    throw error;
  }
};

export const validateTime = (time, fieldName) => {
  if (!time || !TIME_REGEX.test(time)) {
    const error = new Error(
      `${fieldName} must be in HH:mm format`
    );
    error.statusCode = 400;
    throw error;
  }
};

export const validateTimeRange = (startTime, endTime) => {
  validateTime(startTime, "startTime");
  validateTime(endTime, "endTime");

  if (startTime >= endTime) {
    const error = new Error(
      "End time must be later than start time"
    );
    error.statusCode = 400;
    throw error;
  }
};

export const validateStatus = (status) => {
  const allowed = [
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ];

  if (!allowed.includes(status)) {
    const error = new Error(
      `Invalid status. Allowed values: ${allowed.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
};

export const validateCancelReason = (reason) => {
  if (!reason?.trim()) {
    const error = new Error(
      "Cancellation reason is required"
    );
    error.statusCode = 400;
    throw error;
  }
};

export const validateNotes = (notes) => {
  if (typeof notes !== "string") {
    const error = new Error("Notes must be a string");
    error.statusCode = 400;
    throw error;
  }

  if (notes.length > 5000) {
    const error = new Error(
      "Notes cannot exceed 5000 characters"
    );
    error.statusCode = 400;
    throw error;
  }
};