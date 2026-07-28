/**
 * Validate Create Coach Invitation
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Normalize values
    req.body.coachName = coachName.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.specialization = specialization.trim();
    req.body.experience = experience.trim();

    next();
  } catch (error) {
    console.error("Create Coach Invitation Validation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};

/**
 * Validate Update Coach Invitation
 */
export const updateCoachInvitationValidation = (req, res, next) => {
  try {
    const { coachName, email, specialization, experience } = req.body;

    // At least one field is required
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

    // Trim optional fields
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
    console.error("Update Coach Invitation Validation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Validation failed.",
    });
  }
};