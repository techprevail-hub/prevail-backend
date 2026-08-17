// routes/role-institute/inviteCoach.routes.js

import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachInvitations,
  getCoachInvitationById,
  createCoachInvitation,
  downloadCoachInvitationTemplate,
  createBulkCoachInvitations,
  updateCoachInvitation,
  cancelCoachInvitation,
  acceptCoachInvitation,
  resendCoachInvitation,
} from "../../controllers/role-institute/inviteCoach.controller.js";

import {
  createCoachInvitationValidation,
  updateCoachInvitationValidation,
  bulkCoachInvitationValidation,
} from "../../validations/role-institute/inviteCoach.validation.js";

import { uploadCoachExcel } from "../../middleware/uploadCoachExcel.js";

const router = express.Router();

/**
 * Coach Invitation Routes
 */

// Get all invitations
router.get(
  "/",
  verifyToken,
  getCoachInvitations
);

// Download Excel template for bulk invitations
router.get(
  "/template",
  verifyToken,
  downloadCoachInvitationTemplate
);

// Bulk coach invitation from Excel
router.post(
  "/bulk",
  verifyToken,
  uploadCoachExcel.single("file"),
  createBulkCoachInvitations
);

// Accept invitation
router.post(
  "/accept",
  verifyToken,
  acceptCoachInvitation
);

// Create single coach invitation
router.post(
  "/",
  verifyToken,
  createCoachInvitationValidation,
  createCoachInvitation
);

// Get invitation by ID
router.get(
  "/:id",
  verifyToken,
  getCoachInvitationById
);

// Update invitation
router.put(
  "/:id",
  verifyToken,
  updateCoachInvitationValidation,
  updateCoachInvitation
);

// Cancel invitation
router.patch(
  "/:id/cancel",
  verifyToken,
  cancelCoachInvitation
);

// Resend invitation
router.post(
  "/:id/resend",
  verifyToken,
  resendCoachInvitation
);

export default router;