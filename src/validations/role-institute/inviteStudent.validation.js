// validations/role-institute/inviteStudent.validation.js

/**
 * Validate single student invitation
 */
export const createStudentInvitationValidation = (req, res, next) => {
  try {
    const { studentName, email, course, branch, batch } = req.body;

    // Required fields
    if (!studentName || !studentName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!course || !course.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course is required.",
      });
    }

    if (!branch || !branch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch is required.",
      });
    }

    if (!batch || !batch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Batch is required.",
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
    req.body.studentName = studentName.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.course = course.trim();
    req.body.branch = branch.trim();
    req.body.batch = batch.trim();

    next();
  } catch (error) {
    console.error(
      "❌ Single student invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};

/**
 * Validate bulk student invitation Excel upload
 *
 * This validation only checks the uploaded file.
 * The actual Excel content, columns, student data,
 * duplicate checking, invitation creation, and email
 * processing are handled by the bulk service.
 */
export const bulkStudentInvitationValidation = (req, res, next) => {
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
      "❌ Bulk student invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "File validation failed.",
    });
  }
};

/**
 * Validate update student invitation
 */
export const updateStudentInvitationValidation = (req, res, next) => {
  try {
    const { studentName, email, course, branch, batch } = req.body;

    // At least one field must be provided
    if (
      studentName === undefined &&
      email === undefined &&
      course === undefined &&
      branch === undefined &&
      batch === undefined
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
    if (studentName !== undefined) {
      req.body.studentName = studentName.trim();
    }

    if (course !== undefined) {
      req.body.course = course.trim();
    }

    if (branch !== undefined) {
      req.body.branch = branch.trim();
    }

    if (batch !== undefined) {
      req.body.batch = batch.trim();
    }

    next();
  } catch (error) {
    console.error(
      "❌ Update student invitation validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};