import express from "express";
import {
  analyzeLinkedInProfile,
  getLinkedInHistory,
} from "../controllers/linkedinController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * @route   GET /api/linkedin/test
 * @desc    Test route to verify LinkedIn APIs are working
 * @access  Public
 */
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LinkedIn routes are working successfully.",
  });
});

/**
 * @route   POST /api/linkedin/analyze
 * @desc    Analyze LinkedIn profile using Gemini AI
 * @access  Private (JWT token required)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body (JSON):
 * {
 *   "profileUrl": "https://www.linkedin.com/in/example",
 *   "profileText": "Full LinkedIn profile text..."
 * }
 */
router.post(
  "/analyze",
  verifyToken,
  analyzeLinkedInProfile
);

/**
 * @route   GET /api/linkedin/history
 * @desc    Get LinkedIn analysis history for the logged-in user
 * @access  Private (JWT token required)
 *
 * Headers:
 * Authorization: Bearer <token>
 */
router.get(
  "/history",
  verifyToken,
  getLinkedInHistory
);

export default router;