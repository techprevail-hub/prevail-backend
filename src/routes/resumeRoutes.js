import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { uploadResume } from "../controllers/resumeController.js";

const router = express.Router();

/**
 * GET /api/resume/test
 * Test route
 */
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Resume routes are working successfully.",
  });
});

/**
 * POST /api/resume/upload
 * Temporary public route for debugging
 */
router.post(
  "/upload",
  upload.single("resume"),
  uploadResume
);

export default router;