
import express from "express";

import {
  createCoachProfile,
  getCoachProfile,
  updateCoachProfile,
} from "../../controllers/role-coach/profile.controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Create coach profile
router.post(
  "/create",
  authMiddleware,
  createCoachProfile
);

// Get logged-in coach profile
router.get(
  "/me",
  authMiddleware,
  getCoachProfile
);

// Update coach profile
router.put(
  "/update",
  authMiddleware,
  updateCoachProfile
);

export default router;
