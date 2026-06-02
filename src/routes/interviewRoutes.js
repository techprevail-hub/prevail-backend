import express from "express";

import verifyToken from "../middleware/verifyToken.js";

import {
  startInterview,
  answerInterview,
  getInterviewHistory,
  updateInterview,
  deleteInterview,
  getInterviewSession, // Add this new import
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
// POST /api/interview/answer
// --------------------------------------------------
router.post(
  "/answer",
  verifyToken,
  answerInterview
);

// --------------------------------------------------
// GET INTERVIEW HISTORY
// GET /api/interview
// --------------------------------------------------
router.get(
  "/",
  verifyToken,
  getInterviewHistory
);

// --------------------------------------------------
// GET SINGLE INTERVIEW SESSION
// GET /api/interview/session/:id
// --------------------------------------------------
router.get(
  "/session/:id",
  verifyToken,
  getInterviewSession
);

// --------------------------------------------------
// UPDATE INTERVIEW SESSION
// PUT /api/interview/:id
// --------------------------------------------------
router.put(
  "/:id",
  verifyToken,
  updateInterview
);

// --------------------------------------------------
// DELETE INTERVIEW SESSION
// DELETE /api/interview/:id
// --------------------------------------------------
router.delete(
  "/:id",
  verifyToken,
  deleteInterview
);

export default router;