import express from "express";

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
router.get("/", getStudentInvitations);

// Get invitation by ID
router.get("/:id", getStudentInvitationById);

// Create invitation
router.post(
  "/",
  createStudentInvitationValidation,
  createStudentInvitation
);

// Update invitation
router.put(
  "/:id",
  updateStudentInvitationValidation,
  updateStudentInvitation
);

// Cancel invitation (Soft Delete)
router.patch("/:id/cancel", cancelStudentInvitation);

export default router;