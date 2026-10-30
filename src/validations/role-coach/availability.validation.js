const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

const isValidTime = (time) =>
  typeof time === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const isValidDate = (date) => {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const isValidTimezone = (timezone) => {
  if (typeof timezone !== "string" || !timezone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const isValidServiceId = (serviceId) =>
  typeof serviceId === "string" && serviceId.trim().length > 0;

const isValidCapacity = (capacity) =>
  Number.isInteger(capacity) && capacity >= 1;

const isValidDay = (day) =>
  Number.isInteger(day) && day >= 0 && day <= 6;

/**
 * Create weekly availability.
 * Accepts daysOfWeek: [1, 2, 3] or legacy dayOfWeek: 1.
 */
export const validateCreateAvailability = (req, res, next) => {
  const {
    serviceId,
    dayOfWeek,
    daysOfWeek,
    startTime,
    endTime,
    timezone,
    capacity,
  } = req.body || {};

  const errors = {};

  if (!serviceId) {
    errors.serviceId = "Service ID is required";
  } else if (!isValidServiceId(serviceId)) {
    errors.serviceId = "Invalid service ID";
  }

  // Accept either the new array or the old single-day field.
  if (daysOfWeek !== undefined && dayOfWeek !== undefined) {
    errors.daysOfWeek =
      "Send either daysOfWeek or dayOfWeek, not both";
  } else if (daysOfWeek !== undefined) {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      errors.daysOfWeek = "Select at least one day";
    } else {
      if (!daysOfWeek.every(isValidDay)) {
        errors.daysOfWeek =
          "Every day must be an integer between 0 and 6";
      }

      if (new Set(daysOfWeek).size !== daysOfWeek.length) {
        errors.daysOfWeek = "Duplicate weekdays are not allowed";
      }
    }
  } else if (dayOfWeek === undefined || dayOfWeek === null) {
    errors.daysOfWeek = "Select at least one day";
  } else if (!isValidDay(dayOfWeek)) {
    errors.dayOfWeek = "Day of week must be an integer between 0 and 6";
  }

  if (!startTime) {
    errors.startTime = "Start time is required";
  } else if (!isValidTime(startTime)) {
    errors.startTime = "Start time must be in HH:mm format";
  }

  if (!endTime) {
    errors.endTime = "End time is required";
  } else if (!isValidTime(endTime)) {
    errors.endTime = "End time must be in HH:mm format";
  }

  if (
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime = "End time must be later than start time";
  }

  if (capacity === undefined || capacity === null) {
    errors.capacity = "Capacity is required";
  } else if (!isValidCapacity(capacity)) {
    errors.capacity = "Capacity must be a positive integer";
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Update weekly availability.
 * Updates remain single-record operations.
 */
export const validateUpdateAvailability = (req, res, next) => {
  const {
    serviceId,
    dayOfWeek,
    daysOfWeek,
    startTime,
    endTime,
    timezone,
    capacity,
  } = req.body || {};

  const errors = {};

  if (daysOfWeek !== undefined) {
    errors.daysOfWeek =
      "daysOfWeek is not supported when updating one availability slot. Use dayOfWeek.";
  }

  if (
    serviceId !== undefined &&
    !isValidServiceId(serviceId)
  ) {
    errors.serviceId = "Invalid service ID";
  }

  if (dayOfWeek !== undefined && !isValidDay(dayOfWeek)) {
    errors.dayOfWeek =
      "Day of week must be an integer between 0 and 6";
  }

  if (startTime !== undefined && !isValidTime(startTime)) {
    errors.startTime = "Start time must be in HH:mm format";
  }

  if (endTime !== undefined && !isValidTime(endTime)) {
    errors.endTime = "End time must be in HH:mm format";
  }

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime = "End time must be later than start time";
  }

  if (
    capacity !== undefined &&
    !isValidCapacity(capacity)
  ) {
    errors.capacity = "Capacity must be a positive integer";
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

export const validateToggleAvailability = (req, res, next) => {
  const { isActive } = req.body || {};

  if (typeof isActive !== "boolean") {
    return sendValidationError(res, {
      isActive: "isActive must be a boolean",
    });
  }

  next();
};

export const validateCreateOverride = (req, res, next) => {
  const {
    overrideDate,
    startTime,
    endTime,
    overrideType,
    timezone,
  } = req.body || {};

  const errors = {};

  if (!overrideDate) {
    errors.overrideDate = "Override date is required";
  } else if (!isValidDate(overrideDate)) {
    errors.overrideDate =
      "Override date must be in YYYY-MM-DD format";
  }

  if (!overrideType) {
    errors.overrideType = "Override type is required";
  } else if (!["available", "blocked"].includes(overrideType)) {
    errors.overrideType =
      "Override type must be available or blocked";
  }

  if (overrideType === "available") {
    if (!startTime) {
      errors.startTime = "Start time is required";
    } else if (!isValidTime(startTime)) {
      errors.startTime = "Start time must be in HH:mm format";
    }

    if (!endTime) {
      errors.endTime = "End time is required";
    } else if (!isValidTime(endTime)) {
      errors.endTime = "End time must be in HH:mm format";
    }

    if (
      isValidTime(startTime) &&
      isValidTime(endTime) &&
      startTime >= endTime
    ) {
      errors.endTime = "End time must be later than start time";
    }
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

export const validateUpdateOverride = (req, res, next) => {
  const {
    overrideDate,
    startTime,
    endTime,
    overrideType,
    timezone,
  } = req.body || {};

  const errors = {};

  if (
    overrideDate !== undefined &&
    !isValidDate(overrideDate)
  ) {
    errors.overrideDate =
      "Override date must be in YYYY-MM-DD format";
  }

  if (
    overrideType !== undefined &&
    !["available", "blocked"].includes(overrideType)
  ) {
    errors.overrideType =
      "Override type must be available or blocked";
  }

  if (
    startTime !== undefined &&
    !isValidTime(startTime)
  ) {
    errors.startTime = "Start time must be in HH:mm format";
  }

  if (
    endTime !== undefined &&
    !isValidTime(endTime)
  ) {
    errors.endTime = "End time must be in HH:mm format";
  }

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime = "End time must be later than start time";
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};