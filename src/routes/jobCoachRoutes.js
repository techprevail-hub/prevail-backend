import express from "express";

import verifyToken from "../middleware/verifyToken.js";

import {
  coachChat,
  getCoachHistory,
} from "../controllers/jobCoachController.js";

const router = express.Router();

// --------------------------------------------------
// POST /api/jobCoach
// --------------------------------------------------
router.post(
  "/",
  verifyToken,
  coachChat
);

// --------------------------------------------------
// GET /api/jobCoach
// --------------------------------------------------
router.get(
  "/",
  verifyToken,
  getCoachHistory
);

export default router;