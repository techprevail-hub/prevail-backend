import express from "express";

import verifyToken from "../middleware/verifyToken.js";

import {
  startInterview,
  answerInterview,
  getInterviewHistory,
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

export default router;