import express from "express";

import {
  createInstituteProfile,
  getInstituteProfile,
  updateInstituteProfile,
} from "../../controllers/role-institute/profile.Controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

import uploadInstituteLogo from "../../middleware/instituteLogoUpload.js";

const router = express.Router();

// --------------------------------------------------
// Create institute profile
// --------------------------------------------------
router.post(
  "/create",
  authMiddleware,
  createInstituteProfile
);

// --------------------------------------------------
// Get logged-in institute profile
// --------------------------------------------------
router.get(
  "/me",
  authMiddleware,
  getInstituteProfile
);

// --------------------------------------------------
// Update institute profile
// Includes optional logo upload
// --------------------------------------------------
router.put(
  "/update",
  authMiddleware,
  uploadInstituteLogo.single("logo"),
  updateInstituteProfile
);

export default router;