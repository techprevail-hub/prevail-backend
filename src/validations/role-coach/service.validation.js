// src/validations/role-coach/service.validation.js

const VALID_SESSION_TYPES = [
  "one_on_one",
  "group",
];

export const validateCreateService = (data) => {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = "Service name is required";
  } else if (data.name.trim().length > 150) {
    errors.name = "Service name cannot exceed 150 characters";
  }

  if (data.description && data.description.length > 2000) {
    errors.description = "Description cannot exceed 2000 characters";
  }

  if (!data.sessionType) {
    errors.sessionType = "Session type is required";
  } else if (!VALID_SESSION_TYPES.includes(data.sessionType)) {
    errors.sessionType = "Invalid session type";
  }

  const duration = Number(data.durationMinutes);

  if (!data.durationMinutes) {
    errors.durationMinutes = "Duration is required";
  } else if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationMinutes = "Duration must be a positive integer";
  }

  const price = Number(data.price);

  if (data.price === undefined || data.price === null || data.price === "") {
    errors.price = "Price is required";
  } else if (Number.isNaN(price) || price < 0) {
    errors.price = "Price must be a valid non-negative number";
  }

  if (data.currency && data.currency.length > 10) {
    errors.currency = "Currency cannot exceed 10 characters";
  }

  if (
    data.isFree !== undefined &&
    typeof data.isFree !== "boolean"
  ) {
    errors.isFree = "isFree must be a boolean";
  }

  if (
    data.isActive !== undefined &&
    typeof data.isActive !== "boolean"
  ) {
    errors.isActive = "isActive must be a boolean";
  }

  if (data.isFree === true && price !== 0) {
    errors.price = "Price must be 0 for a free service";
  }

  return errors;
};

export const validateUpdateService = (data) => {
  const errors = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.name = "Service name cannot be empty";
    } else if (data.name.trim().length > 150) {
      errors.name = "Service name cannot exceed 150 characters";
    }
  }

  if (
    data.description !== undefined &&
    data.description &&
    data.description.length > 2000
  ) {
    errors.description = "Description cannot exceed 2000 characters";
  }

  if (data.sessionType !== undefined) {
    if (!VALID_SESSION_TYPES.includes(data.sessionType)) {
      errors.sessionType = "Invalid session type";
    }
  }

  if (data.durationMinutes !== undefined) {
    const duration = Number(data.durationMinutes);

    if (!Number.isInteger(duration) || duration <= 0) {
      errors.durationMinutes = "Duration must be a positive integer";
    }
  }

  if (data.price !== undefined) {
    const price = Number(data.price);

    if (Number.isNaN(price) || price < 0) {
      errors.price = "Price must be a valid non-negative number";
    }
  }

  if (data.isFree !== undefined && typeof data.isFree !== "boolean") {
    errors.isFree = "isFree must be a boolean";
  }

  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.isActive = "isActive must be a boolean";
  }

  return errors;
};