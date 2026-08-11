import express from "express";

import {
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/role-institute/profile.Controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

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