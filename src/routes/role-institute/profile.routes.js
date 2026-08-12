import express from "express";

import {
  createInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/role-institute/profile.Controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Create/initialize logged-in institute profile
router.post(
  "/create",
  authMiddleware,
  createInstituteProfile
);

// Get logged-in institute profile
router.get(
  "/me",
  authMiddleware,
  getInstituteProfile
);

// Update logged-in institute profile
router.put(
  "/update",
  authMiddleware,
  updateInstituteProfile
);

export default router;