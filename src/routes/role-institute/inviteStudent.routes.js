import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getStudentInvitations,
  getStudentInvitationById,
  createStudentInvitation,
  downloadStudentInvitationTemplate,
  createBulkStudentInvitations,
  updateStudentInvitation,
  cancelStudentInvitation,
  acceptStudentInvitation,
  resendStudentInvitation,
} from "../../controllers/role-institute/inviteStudent.controller.js";

import {
  createStudentInvitationValidation,
  updateStudentInvitationValidation,
} from "../../validations/role-institute/inviteStudent.validation.js";

import { uploadStudentExcel } from "../../middleware/uploadStudentExcel.js";

const router = express.Router();

/**
 * Student Invitation Routes
 */

// Get all invitations
router.get(
  "/",
  verifyToken,
  getStudentInvitations
);

// Download Excel template for bulk invitations
router.get(
  "/template",
  verifyToken,
  downloadStudentInvitationTemplate
);

// Bulk student invitation from Excel
router.post(
  "/bulk",
  verifyToken,
  uploadStudentExcel.single("file"),
  createBulkStudentInvitations
);

// Accept invitation
router.post(
  "/accept",
  verifyToken,
  acceptStudentInvitation
);

// Create single student invitation
router.post(
  "/",
  verifyToken,
  createStudentInvitationValidation,
  createStudentInvitation
);

// Get invitation by ID
router.get(
  "/:id",
  verifyToken,
  getStudentInvitationById
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

// Resend invitation
router.post(
  "/:id/resend",
  verifyToken,
  resendStudentInvitation
);

export default router;