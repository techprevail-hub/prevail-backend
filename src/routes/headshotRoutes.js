import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import verifyToken from "../middleware/verifyToken.js";

import {
  generateHeadshot,
} from "../controllers/headshotController.js";

const router = express.Router();

/**
 * POST /api/headshot
 * Upload image and generate AI headshots
 */
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  generateHeadshot
);

/**
 * GET /api/headshot
 * Simple test route
 */
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Headshot API is working properly.",
  });
});

export default router;