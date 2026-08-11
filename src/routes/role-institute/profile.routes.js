import express from "express";

import {
  createInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/role-institute/profile.Controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Create Institute Profile
router.post(
  "/create",
  authMiddleware,
  createInstituteProfile
);

// Get Logged-in Institute Profile
router.get(
  "/me",
  authMiddleware,
  getInstituteProfile
);

// Update Institute Profile
router.put(
  "/update",
  authMiddleware,
  updateInstituteProfile
);

export default router;