// controllers/role-seeker/nps.controller.js

import {
  getSurveyForStudentService,
  submitSurveyResponseService,
  getStudentSurveyStatusService,
  getStudentReferralService,
  getReferralByCodeService,
  incrementReferralClickService,
  incrementReferralSignupService,
  incrementReferralEnrollmentService,
} from "../../services/role-institute/nps.service.js";

/**
 * Common Error Handler
 * Handles different types of errors with appropriate HTTP status codes
 */
const handleControllerError = (error, res) => {
  console.error("Controller Error:", error);

  // Validation errors (400)
  if (
    error.message.includes("required") ||
    error.message.includes("Invalid") ||
    error.message.includes("expired") ||
    error.message.includes("already submitted") ||
    error.message.includes("already been used") ||
    error.message.includes("must have") ||
    error.message.includes("cannot have") ||
    error.message.includes("Missing")
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Not found errors (404)
  if (error.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  // Unauthorized/Token errors (401)
  if (error.message.includes("Unauthorized") ||
      error.message.includes("not authorized") ||
      error.message.includes("invalid token") ||
      error.message.includes("token has expired")) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }

  // Conflict errors (409)
  if (error.message.includes("already submitted") ||
      error.message.includes("already exists")) {
    return res.status(409).json({
      success: false,
      message: error.message,
    });
  }

  // Default server error (500)
  return res.status(500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};

/* -------------------------------------------------------------------------- */
/*                         Get Survey From Email Link                          */
/* -------------------------------------------------------------------------- */

/**
 * GET /surveys/:surveyId
 * Student opens survey from email link
 * Validates token and returns survey questions
 */
export const getSurveyForStudent = async (req, res) => {
  try {
    const result = await getSurveyForStudentService({
      surveyId: req.params.surveyId,
      token: req.query.token,
      studentId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                           Submit Survey Response                           */
/* -------------------------------------------------------------------------- */

/**
 * POST /surveys/:surveyId/submit
 * Student submits their survey answers
 */
export const submitSurveyResponse = async (req, res) => {
  try {
    const result = await submitSurveyResponseService({
      surveyId: req.params.surveyId,
      institutionId: req.body.institutionId,
      studentId: req.user.id,
      answers: req.body.answers,
      token: req.body.token,
    });

    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                         Check Survey Submission Status                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /surveys/:surveyId/status
 * Check if student has already submitted a specific survey
 */
export const getStudentSurveyStatus = async (req, res) => {
  try {
    const result = await getStudentSurveyStatusService({
      surveyId: req.params.surveyId,
      institutionId: req.query.institutionId,
      studentId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                            Student Referral Details                         */
/* -------------------------------------------------------------------------- */

/**
 * GET /referral/student
 * Student checks their own referral information
 */
export const getStudentReferral = async (req, res) => {
  try {
    const result = await getStudentReferralService({
      institutionId: req.query.institutionId,
      studentId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                            Get Referral By Code                             */
/* -------------------------------------------------------------------------- */

/**
 * GET /referral/:referralCode
 * Public endpoint - get referral details by code (used during signup)
 */
export const getReferralByCode = async (req, res) => {
  try {
    const result = await getReferralByCodeService(
      req.params.referralCode
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                          Increment Referral Click                           */
/* -------------------------------------------------------------------------- */

/**
 * POST /referral/:referralCode/click
 * Public endpoint - track when someone clicks a referral link
 */
export const incrementReferralClick = async (req, res) => {
  try {
    const result = await incrementReferralClickService(
      req.params.referralCode
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                         Increment Referral Signup                           */
/* -------------------------------------------------------------------------- */

/**
 * POST /referral/:referralCode/signup
 * Track when someone signs up using a referral code
 */
export const incrementReferralSignup = async (req, res) => {
  try {
    const result = await incrementReferralSignupService(
      req.params.referralCode
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/* -------------------------------------------------------------------------- */
/*                      Increment Referral Enrollment                          */
/* -------------------------------------------------------------------------- */

/**
 * POST /referral/:referralCode/enrollment
 * Track when someone enrolls using a referral code
 */
export const incrementReferralEnrollment = async (req, res) => {
  try {
    const result = await incrementReferralEnrollmentService(
      req.params.referralCode
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};