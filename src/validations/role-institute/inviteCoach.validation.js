// validations/role-institute/inviteCoach.validation.js

/**
 * Validate single coach invitation
 */
export const createCoachInvitationValidation = (req, res, next) => {
  try {
    const { coachName, email, specialization, experience } = req.body;

    // Required fields
    if (!coachName || !coachName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coach name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!specialization || !specialization.trim()) {
      return res.status(400).json({
        success: false,
        message: "Specialization is required.",
      });
    }

    if (!experience || !experience.trim()) {
      return res.status(400).json({
        success: false,
        message: "Experience is required.",
      });
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Normalize values before reaching service
    req.body.coachName = coachName.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.specialization = specialization.trim();
    req.body.experience = experience.trim();

    next();
  } catch (error) {
    console.error(
      "❌ Single coach invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};

/**
 * Validate bulk coach invitation Excel upload
 *
 * This validation only checks the uploaded file.
 * The actual Excel content, columns, coach data,
 * duplicate checking, invitation creation, and email
 * processing are handled by the bulk service.
 */
export const bulkCoachInvitationValidation = (req, res, next) => {
  try {
    // Check whether file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file.",
      });
    }

    // Check file extension
    const allowedExtensions = [".xlsx", ".xls"];

    const originalName = req.file.originalname || "";

    const extension = originalName
      .toLowerCase()
      .slice(originalName.lastIndexOf("."));

    if (!allowedExtensions.includes(extension)) {
      return res.status(400).json({
        success: false,
        message: "Only Excel files (.xlsx or .xls) are allowed.",
      });
    }

    // Check file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Excel file size cannot exceed 5 MB.",
      });
    }

    next();
  } catch (error) {
    console.error(
      "❌ Bulk coach invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "File validation failed.",
    });
  }
};

/**
 * Validate update coach invitation
 */
export const updateCoachInvitationValidation = (req, res, next) => {
  try {
    const { coachName, email, specialization, experience } = req.body;

    // At least one field must be provided
    if (
      coachName === undefined &&
      email === undefined &&
      specialization === undefined &&
      experience === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    // Validate email if provided
    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty.",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      req.body.email = email.trim().toLowerCase();
    }

    // Trim provided fields
    if (coachName !== undefined) {
      req.body.coachName = coachName.trim();
    }

    if (specialization !== undefined) {
      req.body.specialization = specialization.trim();
    }

    if (experience !== undefined) {
      req.body.experience = experience.trim();
    }

    next();
  } catch (error) {
    console.error(
      "❌ Update coach invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};