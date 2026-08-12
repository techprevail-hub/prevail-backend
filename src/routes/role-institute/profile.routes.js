import express from "express";

import {
  createInstituteProfile,
  uploadInstituteLogo,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/role-institute/profile.Controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";
import upload from "../../middleware/uploadMiddleware.js";

const router = express.Router();

// Create/initialize logged-in institute profile
router.post(
  "/create",
  authMiddleware,
  createInstituteProfile
);

// Upload institute profile logo
router.post(
  "/logo",
  authMiddleware,
  upload.single("logo"),
  uploadInstituteLogo
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