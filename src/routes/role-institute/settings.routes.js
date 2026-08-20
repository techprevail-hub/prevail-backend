// routes/role-institute/settings.routes.js

import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getInstituteSettings,
  updateInstituteNotificationSettings,
  updateInstituteFeatureSettings,
} from "../../controllers/role-institute/settings.controller.js";

import {
  updateInstituteNotificationSettingsValidation,
  updateInstituteFeatureSettingsValidation,
} from "../../validations/role-institute/settings.validation.js";

const router = express.Router();

/**
 * GET INSTITUTE SETTINGS
 */
router.get(
  "/",
  verifyToken,
  getInstituteSettings
);

/**
 * UPDATE NOTIFICATION SETTINGS
 */
router.put(
  "/notifications",
  verifyToken,
  updateInstituteNotificationSettingsValidation,
  updateInstituteNotificationSettings
);

/**
 * UPDATE FEATURE SETTINGS
 */
router.put(
  "/features",
  verifyToken,
  updateInstituteFeatureSettingsValidation,
  updateInstituteFeatureSettings
);

export default router;