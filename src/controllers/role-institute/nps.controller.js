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

// ─── Import Notification Service ──────────────────────────────────────────
import { createNotificationService } from "../../services/notificationService.js";
import supabase from "../../services/supabaseClient.js";

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
      institute_id: req.user.id,
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
      institute_id: req.user.id,
      title: req.body.title,
      description: req.body.description,
      selectedQuestions: req.body.selectedQuestions,
      sendAfterDays: req.body.sendAfterDays,
      status: req.body.status,
    });

    // ─── Create Notification for Survey Creation ──────────────────────────
    if (result.success && result.data) {
      try {
        await createNotificationService(
          req.user.id,
          `Survey Created: ${req.body.title}`,
          `Your survey "${req.body.title}" has been created successfully. You can now send it to students and coaches.`,
          "success",
          "survey",
          `/dashboard/institute/nps`
        );
      } catch (notifError) {
        console.error("Error creating survey notification:", notifError);
        // Don't block the main flow if notification fails
      }
    }

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

    // ─── Create Notification for Survey Update ────────────────────────────
    if (result.success && result.data) {
      try {
        await createNotificationService(
          req.user.id,
          `Survey Updated: ${req.body.title || result.data.title}`,
          `Your survey "${req.body.title || result.data.title}" has been updated successfully.`,
          "system",
          "survey",
          `/dashboard/institute/nps`
        );
      } catch (notifError) {
        console.error("Error creating survey update notification:", notifError);
        // Don't block the main flow if notification fails
      }
    }

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
    // Get survey title before deletion for notification
    const surveyResult = await getSurveyByIdService(req.params.id, req.user.id);
    const surveyTitle = surveyResult.success && surveyResult.data ? surveyResult.data.title : "Survey";

    const result = await deleteSurveyService(
      req.params.id,
      req.user.id
    );

    // ─── Create Notification for Survey Deletion ──────────────────────────
    if (result.success) {
      try {
        await createNotificationService(
          req.user.id,
          `Survey Deleted: ${surveyTitle}`,
          `Your survey "${surveyTitle}" has been deleted successfully.`,
          "system",
          "survey",
          `/dashboard/institute/nps`
        );
      } catch (notifError) {
        console.error("Error creating survey deletion notification:", notifError);
        // Don't block the main flow if notification fails
      }
    }

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

    // ─── Create Notifications for Survey Send ─────────────────────────────
    if (result.success) {
      try {
        const surveyId = req.params.id;
        const { studentIds = [], coachIds = [] } = req.body;
        const allRecipientIds = [...studentIds, ...coachIds];

        // Get survey details for notification
        const surveyResult = await getSurveyByIdService(surveyId, req.user.id);
        const surveyTitle = surveyResult.success && surveyResult.data 
          ? surveyResult.data.title 
          : "Survey";
        
        const sentCount = result.data?.sentCount || 0;
        const sentRecipients = result.data?.sentRecipients || allRecipientIds;

        // ─── 1. Send notification to each recipient (students and coaches) ──
        if (sentRecipients && sentRecipients.length > 0) {
          // Get user details for each recipient to send personalized notifications
          for (const recipientId of sentRecipients) {
            try {
              // Determine if it's a student or coach
              const isStudent = studentIds.includes(recipientId);
              const tableName = isStudent ? "students" : "coaches";
              const nameField = isStudent ? "student_name" : "coach_name";

              // Get user details from database
              const { data: userData } = await supabase
                .from(tableName)
                .select(`${nameField}, email`)
                .eq("id", recipientId)
                .maybeSingle();

              const userName = userData?.[nameField] || (isStudent ? "Student" : "Coach");

              // Create notification for the recipient
              await createNotificationService(
                recipientId,
                `New Survey: ${surveyTitle}`,
                `Hi ${userName}, you have received a new survey "${surveyTitle}". Please take a moment to share your valuable feedback.`,
                "survey",
                "survey_invitation",
                `/dashboard/surveys/${surveyId}`
              );
            } catch (recipientError) {
              console.error(`Error sending notification to recipient ${recipientId}:`, recipientError);
              // Continue with other recipients even if one fails
            }
          }
        }

        // ─── 2. Send notification to the institute admin ──────────────────
        // Get institute name for notification
        const { data: instituteData } = await supabase
          .from("institutes")
          .select("institute_name")
          .eq("id", req.user.id)
          .maybeSingle();

        const instituteName = instituteData?.institute_name || "Your institute";

        await createNotificationService(
          req.user.id,
          `Survey Sent: ${surveyTitle}`,
          `Your survey "${surveyTitle}" has been successfully sent to ${sentCount} recipient${sentCount !== 1 ? 's' : ''} from ${instituteName}.`,
          "success",
          "survey_sent",
          `/dashboard/institute/nps/${surveyId}`
        );

      } catch (notifError) {
        console.error("Error creating survey send notifications:", notifError);
        // Don't block the main flow if notification fails
      }
    }

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

    // ─── If this is a student/coach viewing their response, mark as read ──
    // This is handled in the service

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