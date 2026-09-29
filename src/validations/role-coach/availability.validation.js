// src/validations/role-coach/availability.validation.js

const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

const isValidTime = (time) => {
  return (
    typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
};

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
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
};

/**
 * Create weekly availability
 */
export const validateCreateAvailability = (req, res, next) => {
  const {
    dayOfWeek,
    startTime,
    endTime,
    timezone,
  } = req.body;

  const errors = {};

  if (
    dayOfWeek === undefined ||
    dayOfWeek === null
  ) {
    errors.dayOfWeek = "Day of week is required";
  } else if (
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    errors.dayOfWeek =
      "Day of week must be between 0 and 6";
  }

  if (!startTime) {
    errors.startTime = "Start time is required";
  } else if (!isValidTime(startTime)) {
    errors.startTime =
      "Start time must be in HH:mm format";
  }

  if (!endTime) {
    errors.endTime = "End time is required";
  } else if (!isValidTime(endTime)) {
    errors.endTime =
      "End time must be in HH:mm format";
  }

  if (
    startTime &&
    endTime &&
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime =
      "End time must be later than start time";
  }

  if (
    timezone !== undefined &&
    !isValidTimezone(timezone)
  ) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Update weekly availability
 */
export const validateUpdateAvailability = (
  req,
  res,
  next
) => {
  const {
    dayOfWeek,
    startTime,
    endTime,
    timezone,
  } = req.body;

  const errors = {};

  if (dayOfWeek !== undefined) {
    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      errors.dayOfWeek =
        "Day of week must be between 0 and 6";
    }
  }

  if (startTime !== undefined) {
    if (!isValidTime(startTime)) {
      errors.startTime =
        "Start time must be in HH:mm format";
    }
  }

  if (endTime !== undefined) {
    if (!isValidTime(endTime)) {
      errors.endTime =
        "End time must be in HH:mm format";
    }
  }

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime =
      "End time must be later than start time";
  }

  if (
    timezone !== undefined &&
    !isValidTimezone(timezone)
  ) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Toggle weekly availability
 */
export const validateToggleAvailability = (
  req,
  res,
  next
) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return sendValidationError(res, {
      isActive: "isActive must be a boolean",
    });
  }

  next();
};

/**
 * Create date-specific override
 */
export const validateCreateOverride = (
  req,
  res,
  next
) => {
  const {
    overrideDate,
    startTime,
    endTime,
    overrideType,
    timezone,
  } = req.body;

  const errors = {};

  if (!overrideDate) {
    errors.overrideDate =
      "Override date is required";
  } else if (!isValidDate(overrideDate)) {
    errors.overrideDate =
      "Override date must be in YYYY-MM-DD format";
  }

  if (!overrideType) {
    errors.overrideType =
      "Override type is required";
  } else if (
    !["available", "blocked"].includes(
      overrideType
    )
  ) {
    errors.overrideType =
      "Override type must be available or blocked";
  }

  if (overrideType === "available") {
    if (!startTime) {
      errors.startTime =
        "Start time is required";
    } else if (!isValidTime(startTime)) {
      errors.startTime =
        "Start time must be in HH:mm format";
    }

    if (!endTime) {
      errors.endTime =
        "End time is required";
    } else if (!isValidTime(endTime)) {
      errors.endTime =
        "End time must be in HH:mm format";
    }

    if (
      startTime &&
      endTime &&
      isValidTime(startTime) &&
      isValidTime(endTime) &&
      startTime >= endTime
    ) {
      errors.endTime =
        "End time must be later than start time";
    }
  }

  if (
    timezone !== undefined &&
    !isValidTimezone(timezone)
  ) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Update date-specific override
 */
export const validateUpdateOverride = (
  req,
  res,
  next
) => {
  const {
    overrideDate,
    startTime,
    endTime,
    overrideType,
    timezone,
  } = req.body;

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
    !["available", "blocked"].includes(
      overrideType
    )
  ) {
    errors.overrideType =
      "Override type must be available or blocked";
  }

  if (startTime !== undefined) {
    if (!isValidTime(startTime)) {
      errors.startTime =
        "Start time must be in HH:mm format";
    }
  }

  if (endTime !== undefined) {
    if (!isValidTime(endTime)) {
      errors.endTime =
        "End time must be in HH:mm format";
    }
  }

  if (
    startTime !== undefined &&
    endTime !== undefined &&
    isValidTime(startTime) &&
    isValidTime(endTime) &&
    startTime >= endTime
  ) {
    errors.endTime =
      "End time must be later than start time";
  }

  if (
    timezone !== undefined &&
    !isValidTimezone(timezone)
  ) {
    errors.timezone = "Invalid timezone";
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};