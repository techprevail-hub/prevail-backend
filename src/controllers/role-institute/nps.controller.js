// controllers/role-institute/nps.controller.js

import {
  // Survey Questions
  getSurveyQuestionsService,
  getSurveyQuestionByIdService,
  createSurveyQuestionService,
  updateSurveyQuestionService,
  deleteSurveyQuestionService,

  // Surveys
  getSurveysService,
  getSurveyByIdService,
  createSurveyService,
  updateSurveyService,
  deleteSurveyService,

  // Send Survey
  sendSurveyService,

  // Survey Responses
  getSurveyResponsesService,
  getSurveyResponseByIdService,

  // Dashboard
  getSurveyDashboardService,

  // Referral
  getReferralByCodeService,
  incrementReferralClickService,
  incrementReferralSignupService,
  incrementReferralEnrollmentService,
} from "../../services/role-institute/nps.service.js";

// ─── Helper for consistent error handling ──────────────────────────────────

/**
 * Handle controller errors with appropriate status codes
 */
const handleControllerError = (error, res) => {
  console.error("Controller Error:", error);

  // Validation errors
  if (error.message.includes("required") || 
      error.message.includes("must have") || 
      error.message.includes("cannot have") ||
      error.message.includes("Invalid")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Not found errors
  if (error.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  // Unauthorized errors
  if (error.message.includes("Unauthorized") || 
      error.message.includes("not authorized")) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }

  // Default server error
  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error.",
  });
};

// ─── SECTION 1: Dashboard ──────────────────────────────────────────────────

/**
 * Get Survey Dashboard
 */
export const getSurveyDashboard = async (req, res) => {
  try {
    const result = await getSurveyDashboardService({
      ...req.query,
      instituteId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// ─── SECTION 2: Survey Questions ──────────────────────────────────────────

/**
 * Get all survey questions
 */
export const getSurveyQuestions = async (req, res) => {
  try {
    const result = await getSurveyQuestionsService({
      ...req.query,
      instituteId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Get survey question by ID
 */
export const getSurveyQuestionById = async (req, res) => {
  try {
    const result = await getSurveyQuestionByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Create a new survey question
 */
export const createSurveyQuestion = async (req, res) => {
  try {
    const result = await createSurveyQuestionService({
      institutionId: req.user.id,
      questionText: req.body.questionText,
      questionType: req.body.questionType,
      category: req.body.category,
      options: req.body.options,
      isRequired: req.body.isRequired,
    });

    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Update a survey question
 */
export const updateSurveyQuestion = async (req, res) => {
  try {
    const result = await updateSurveyQuestionService(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Delete a survey question
 */
export const deleteSurveyQuestion = async (req, res) => {
  try {
    const result = await deleteSurveyQuestionService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// ─── SECTION 3: Survey Management ─────────────────────────────────────────

/**
 * Get all surveys
 */
export const getSurveys = async (req, res) => {
  try {
    const result = await getSurveysService({
      ...req.query,
      instituteId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Get survey by ID
 */
export const getSurveyById = async (req, res) => {
  try {
    const result = await getSurveyByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Create a new survey
 */
export const createSurvey = async (req, res) => {
  try {
    const result = await createSurveyService({
      institutionId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      selectedQuestions: req.body.selectedQuestions,
      sendAfterDays: req.body.sendAfterDays,
      status: req.body.status,
    });

    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Update a survey
 */
export const updateSurvey = async (req, res) => {
  try {
    const result = await updateSurveyService(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Delete a survey
 */
export const deleteSurvey = async (req, res) => {
  try {
    const result = await deleteSurveyService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// ─── SECTION 4: Send Survey ───────────────────────────────────────────────

/**
 * Send survey to eligible students
 */
export const sendSurvey = async (req, res) => {
  try {
    const result = await sendSurveyService(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// ─── SECTION 5: Survey Responses ──────────────────────────────────────────

/**
 * Get all survey responses
 */
export const getSurveyResponses = async (req, res) => {
  try {
    const result = await getSurveyResponsesService({
      ...req.query,
      surveyId: req.params.surveyId,
      instituteId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * Get survey response by ID
 */
export const getSurveyResponseById = async (req, res) => {
  try {
    const result = await getSurveyResponseByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// ─── SECTION 6: Referral (Public/Shared) ─────────────────────────────────

/**
 * Get Referral By Code
 * This is a public endpoint used during signup
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

/**
 * Increment Referral Click
 * This is a public endpoint triggered when someone clicks a referral link
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

/**
 * Increment Referral Signup
 * This is a public/private endpoint triggered when someone signs up using a referral
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

/**
 * Increment Referral Enrollment
 * This is a public/private endpoint triggered when someone enrolls using a referral
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