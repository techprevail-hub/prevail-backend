// validations/role-institute/inviteStudent.validation.js

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
    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};

export const updateStudentInvitationValidation = (req, res, next) => {
  try {
    const { studentName, course, branch, batch } = req.body;

    // At least one field must be provided
    if (
      studentName === undefined &&
      course === undefined &&
      branch === undefined &&
      batch === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
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
    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};