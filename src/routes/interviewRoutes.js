import express from "express";

import verifyToken from "../middleware/verifyToken.js";

import {
  startInterview,
  answerInterview,
  getInterviewHistory,
  updateInterview,
  deleteInterview,
  getInterviewSession,
  getClientKey,

  // ==============================
  // Professional Video Interview
  // ==============================
  completeVideoInterview,
  getVideoInterview,
} from "../controllers/interviewController.js";

const router = express.Router();

// --------------------------------------------------
// START INTERVIEW
// POST /api/interview/start
// --------------------------------------------------
router.post(
  "/start",
  verifyToken,
  startInterview
);

// --------------------------------------------------
// ANSWER INTERVIEW QUESTION
// Used by Text + Voice Interview
// --------------------------------------------------
router.post(
  "/answer",
  verifyToken,
  answerInterview
);

// --------------------------------------------------
// GET D-ID CLIENT KEY
// --------------------------------------------------
router.get(
  "/client-key",
  verifyToken,
  getClientKey
);

// ==================================================
// PROFESSIONAL VIDEO INTERVIEW
// ==================================================

// Complete Interview
router.post(
  "/video/complete",
  verifyToken,
  completeVideoInterview
);

// Get Video Interview
router.get(
  "/video/:sessionId",
  verifyToken,
  getVideoInterview
);

// --------------------------------------------------
// GET INTERVIEW HISTORY
// --------------------------------------------------
router.get(
  "/",
  verifyToken,
  getInterviewHistory
);

// --------------------------------------------------
// GET SINGLE INTERVIEW SESSION
// --------------------------------------------------
router.get(
  "/session/:id",
  verifyToken,
  getInterviewSession
);

// --------------------------------------------------
// UPDATE INTERVIEW SESSION
// --------------------------------------------------
router.put(
  "/:id",
  verifyToken,
  updateInterview
);

// --------------------------------------------------
// DELETE INTERVIEW SESSION
// --------------------------------------------------
router.delete(
  "/:id",
  verifyToken,
  deleteInterview
);

export default router;