import express from "express";
import { getUserProgress } from "../controllers/progressController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * @route   GET /api/progress
 * @desc    Get user's career readiness progress
 * @access  Private
 *
 * Headers:
 * Authorization: Bearer <token>
 */
router.get(
  "/",
  verifyToken,
  getUserProgress
);

export default router;