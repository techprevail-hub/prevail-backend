import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachInvitations,
  getCoachInvitationById,
  createCoachInvitation,
  updateCoachInvitation,
  cancelCoachInvitation,
  acceptCoachInvitation,
  resendCoachInvitation,
} from "../../controllers/role-institute/inviteCoach.controller.js";

import {
  createCoachInvitationValidation,
  updateCoachInvitationValidation,
} from "../../validations/role-institute/inviteCoach.validation.js";

const router = express.Router();

/**
 * GET /api/role-institute/coach-invitations
 * Get all coach invitations
 */
router.get(
  "/",
  verifyToken,
  getCoachInvitations
);

/**
 * GET /api/role-institute/coach-invitations/:id
 * Get coach invitation by ID
 */
router.get(
  "/:id",
  verifyToken,
  getCoachInvitationById
);

/**
 * POST /api/role-institute/coach-invitations
 * Create coach invitation
 */
router.post(
  "/",
  verifyToken,
  createCoachInvitationValidation,
  createCoachInvitation
);

/**
 * PUT /api/role-institute/coach-invitations/:id
 * Update coach invitation
 */
router.put(
  "/:id",
  verifyToken,
  updateCoachInvitationValidation,
  updateCoachInvitation
);

/**
 * PATCH /api/role-institute/coach-invitations/:id/cancel
 * Cancel coach invitation
 */
router.patch(
  "/:id/cancel",
  verifyToken,
  cancelCoachInvitation
);

/**
 * POST /api/role-institute/coach-invitations/accept
 * Accept coach invitation
 */
router.post(
  "/accept",
  verifyToken,
  acceptCoachInvitation
);

/**
 * POST /api/role-institute/coach-invitations/:id/resend
 * Resend coach invitation
 */
router.post(
  "/:id/resend",
  verifyToken,
  resendCoachInvitation
);

export default router;