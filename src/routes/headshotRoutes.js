import express from "express";

import upload from "../middleware/uploadMiddleware.js";
import verifyToken from "../middleware/verifyToken.js";

import {
  generateHeadshot,
} from "../controllers/headshotController.js";

const router = express.Router();

/**
 * @route   POST /api/headshot
 * @desc    Upload image and generate AI headshots
 * @access  Private
 */
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  generateHeadshot
);

export default router;