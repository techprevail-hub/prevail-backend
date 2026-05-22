import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import verifyToken from "../middleware/verifyToken.js";

import {
  generateHeadshot,
  getHeadshotHistory,
} from "../controllers/headshotController.js";

const router = express.Router();

/**
 * POST /api/headshot
 * Generate AI headshots
 */
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  generateHeadshot
);

/**
 * GET /api/headshot
 * Fetch user headshot history
 */
router.get(
  "/",
  verifyToken,
  getHeadshotHistory
);

export default router;