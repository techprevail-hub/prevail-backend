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

export default router;