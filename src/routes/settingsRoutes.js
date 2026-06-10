import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getSettings,
  updateNotifications,
  updatePreferences,
} from "../controllers/settingsController.js";

const router = express.Router();

router.get(
  "/me",
  authMiddleware,
  getSettings
);

router.put(
  "/notifications",
  authMiddleware,
  updateNotifications
);

router.put(
  "/preferences",
  authMiddleware,
  updatePreferences
);

export default router;