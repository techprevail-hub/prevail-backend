import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { uploadResume } from "../controllers/resumeController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * @route   GET /api/resume/test
 * @desc    Test route to verify resume APIs are working
 * @access  Public
 */
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Resume routes are working successfully.",
  });
});

/**
 * @route   POST /api/resume/upload
 * @desc    Upload and analyze a user's resume
 * @access  Private (JWT token required)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Form Data:
 * resume -> PDF or DOCX file
 */
router.post(
  "/upload",
  verifyToken,
  upload.single("resume"),
  uploadResume
);

export default router;