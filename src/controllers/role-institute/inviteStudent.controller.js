// src/controllers/role-institute/inviteStudent.controller.js

import {
  getStudentInvitationsService,
  getStudentInvitationByIdService,
  createStudentInvitationService,
  updateStudentInvitationService,
  cancelStudentInvitationService,
  resendStudentInvitationService,
  acceptStudentInvitationService,
} from "../../services/role-institute/inviteStudent.service.js";

/**
 * Get All Student Invitations
 * GET /api/student-invitations
 */
export const getStudentInvitations = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const instituteId = req.user?.id;
    const userId = req.user?.id;

    const result = await getStudentInvitationsService({
      ...req.query,
      instituteId,
      invitedBy: userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Student Invitations Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Get Student Invitation By ID
 * GET /api/student-invitations/:id
 */
export const getStudentInvitationById = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const { id } = req.params;
    const instituteId = req.user?.id;

    const result = await getStudentInvitationByIdService(
      id,
      instituteId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Create Student Invitation
 * POST /api/student-invitations
 */
export const createStudentInvitation = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const instituteId = req.user?.id;
    const invitedBy = req.user?.id;

    const result = await createStudentInvitationService({
      ...req.body,
      instituteId,
      invitedBy,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Create Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Update Student Invitation
 * PUT /api/student-invitations/:id
 */
export const updateStudentInvitation = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const { id } = req.params;
    const instituteId = req.user?.id;

    const result = await updateStudentInvitationService(id, {
      ...req.body,
      instituteId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Cancel Student Invitation
 * PATCH /api/student-invitations/:id/cancel
 */
export const cancelStudentInvitation = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const { id } = req.params;

    const instituteId = req.user?.id;
    const cancelledBy = req.user?.id;

    const result = await cancelStudentInvitationService(
      id,
      instituteId,
      cancelledBy
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Cancel Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Accept Student Invitation
 * POST /api/student-invitations/accept
 */
export const acceptStudentInvitation = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const { token } = req.body;
    const userId = req.user?.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    const result = await acceptStudentInvitationService(
      token,
      userId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Accept Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Resend Student Invitation
 * POST /api/student-invitations/:id/resend
 */
export const resendStudentInvitation = async (req, res) => {
  try {
    console.log("REQ.USER =>", req.user);

    const { id } = req.params;
    const instituteId = req.user?.id;

    const result = await resendStudentInvitationService(
      id,
      instituteId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Resend Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};