import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getStudentInvitations,
  getStudentInvitationById,
  createStudentInvitation,
  updateStudentInvitation,
  cancelStudentInvitation,
} from "../../controllers/role-institute/inviteStudent.controller.js";

import {
  createStudentInvitationValidation,
  updateStudentInvitationValidation,
} from "../../validations/role-institute/inviteStudent.validation.js";

const router = express.Router();

/**
 * Student Invitation Routes
 */

// Get all invitations
router.get("/", verifyToken, getStudentInvitations);

// Get invitation by ID
router.get("/:id", verifyToken, getStudentInvitationById);

// Create invitation
router.post(
  "/",
  verifyToken,
  createStudentInvitationValidation,
  createStudentInvitation
);

// Update invitation
router.put(
  "/:id",
  verifyToken,
  updateStudentInvitationValidation,
  updateStudentInvitation
);

// Cancel invitation
router.patch(
  "/:id/cancel",
  verifyToken,
  cancelStudentInvitation
);

export default router;