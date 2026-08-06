import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getSurveyForStudent,
  submitSurveyResponse,
  getStudentSurveyStatus,
  getStudentReferral,
  getReferralByCode,
  incrementReferralClick,
  incrementReferralSignup,
  incrementReferralEnrollment,
} from "../../controllers/role-seeker/nps.controller.js";

import {
  submitSurveyResponseValidation,
} from "../../validations/role-institute/nps.validation.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               Student Survey                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/role-seeker/nps/surveys/:surveyId
 * Get Survey Details (Student opens survey from email)
 */
router.get(
  "/surveys/:surveyId",
  verifyToken,
  getSurveyForStudent
);

/**
 * POST /api/role-seeker/nps/surveys/:surveyId/submit
 * Submit Survey Response
 */
router.post(
  "/surveys/:surveyId/submit",
  verifyToken,
  submitSurveyResponseValidation,
  submitSurveyResponse
);

/**
 * GET /api/role-seeker/nps/surveys/:surveyId/status
 * Check Survey Submission Status
 */
router.get(
  "/surveys/:surveyId/status",
  verifyToken,
  getStudentSurveyStatus
);

/* -------------------------------------------------------------------------- */
/*                               Student Referral                             */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/role-seeker/nps/referral
 * Get Logged-in Student Referral Details
 */
router.get(
  "/referral",
  verifyToken,
  getStudentReferral
);

/* -------------------------------------------------------------------------- */
/*                             Public Referral APIs                           */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/role-seeker/nps/referral/:referralCode
 * Get Referral Details By Code
 */
router.get(
  "/referral/:referralCode",
  getReferralByCode
);

/**
 * PATCH /api/role-seeker/nps/referral/:referralCode/click
 * Increment Referral Click
 */
router.patch(
  "/referral/:referralCode/click",
  incrementReferralClick
);

/**
 * PATCH /api/role-seeker/nps/referral/:referralCode/signup
 * Increment Referral Signup
 */
router.patch(
  "/referral/:referralCode/signup",
  incrementReferralSignup
);

/**
 * PATCH /api/role-seeker/nps/referral/:referralCode/enrollment
 * Increment Referral Enrollment
 */
router.patch(
  "/referral/:referralCode/enrollment",
  incrementReferralEnrollment
);

export default router;