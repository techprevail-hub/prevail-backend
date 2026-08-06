import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  // Dashboard
  getSurveyDashboard,

  // Survey Questions
  getSurveyQuestions,
  getSurveyQuestionById,
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,

  // Survey Management
  getSurveys,
  getSurveyById,
  createSurvey,
  updateSurvey,
  deleteSurvey,

  // Send Survey
  sendSurvey,

  // Survey Responses
  getSurveyResponses,
  getSurveyResponseById,

  // Referral
  getReferralByCode,
  incrementReferralClick,
  incrementReferralSignup,
  incrementReferralEnrollment,
} from "../../controllers/role-institute/nps.controller.js";

import {
  createSurveyQuestionValidation,
  updateSurveyQuestionValidation,
  createSurveyValidation,
  updateSurveyValidation,
  sendSurveyValidation,
} from "../../validations/role-institute/nps.validation.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                                 Dashboard                                  */
/* -------------------------------------------------------------------------- */

router.get(
  "/dashboard",
  verifyToken,
  getSurveyDashboard
);

/* -------------------------------------------------------------------------- */
/*                             Survey Questions                               */
/* -------------------------------------------------------------------------- */

router.get(
  "/questions",
  verifyToken,
  getSurveyQuestions
);

router.get(
  "/questions/:id",
  verifyToken,
  getSurveyQuestionById
);

router.post(
  "/questions",
  verifyToken,
  createSurveyQuestionValidation,
  createSurveyQuestion
);

router.put(
  "/questions/:id",
  verifyToken,
  updateSurveyQuestionValidation,
  updateSurveyQuestion
);

router.delete(
  "/questions/:id",
  verifyToken,
  deleteSurveyQuestion
);

/* -------------------------------------------------------------------------- */
/*                               Survey CRUD                                  */
/* -------------------------------------------------------------------------- */

router.get(
  "/surveys",
  verifyToken,
  getSurveys
);

router.get(
  "/surveys/:id",
  verifyToken,
  getSurveyById
);

router.post(
  "/surveys",
  verifyToken,
  createSurveyValidation,
  createSurvey
);

router.put(
  "/surveys/:id",
  verifyToken,
  updateSurveyValidation,
  updateSurvey
);

router.delete(
  "/surveys/:id",
  verifyToken,
  deleteSurvey
);

/* -------------------------------------------------------------------------- */
/*                               Send Survey                                  */
/* -------------------------------------------------------------------------- */

router.post(
  "/surveys/:id/send",
  verifyToken,
  sendSurveyValidation,
  sendSurvey
);

/* -------------------------------------------------------------------------- */
/*                             Survey Responses                               */
/* -------------------------------------------------------------------------- */

router.get(
  "/surveys/:surveyId/responses",
  verifyToken,
  getSurveyResponses
);

router.get(
  "/responses/:id",
  verifyToken,
  getSurveyResponseById
);

/* -------------------------------------------------------------------------- */
/*                              Referral APIs                                 */
/* -------------------------------------------------------------------------- */

router.get(
  "/referral/:referralCode",
  getReferralByCode
);

router.patch(
  "/referral/:referralCode/click",
  incrementReferralClick
);

router.patch(
  "/referral/:referralCode/signup",
  incrementReferralSignup
);

router.patch(
  "/referral/:referralCode/enrollment",
  incrementReferralEnrollment
);

export default router;