// src/controllers/role-institute/inviteStudent.controller.js
import {
  getStudentInvitationsService,
  getStudentInvitationByIdService,
  createStudentInvitationService,
  updateStudentInvitationService,
  cancelStudentInvitationService,
  resendStudentInvitationService,
} from "../../services/role-institute/inviteStudent.service.js";

/**
 * Get All Student Invitations
 * GET /api/student-invitations
 * Query params: page, limit, search, status, course, batch, sortBy, sortOrder
 */
export const getStudentInvitations = async (req, res) => {
  try {
    // Get instituteId and userId from authenticated user
    const instituteId = req.user?.instituteId;
    const userId = req.user?.id;

    // Pass authenticated user data to service
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
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    const result = await getStudentInvitationByIdService(id, instituteId);

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
 * Body: studentName, email, course, branch, batch
 */
export const createStudentInvitation = async (req, res) => {
  try {
    // Get instituteId and userId from authenticated user
    const instituteId = req.user?.instituteId;
    const invitedBy = req.user?.id;

    // Pass authenticated user data to service
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
 * Body: studentName, course, branch, batch
 */
export const updateStudentInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

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
 * DELETE /api/student-invitations/:id/cancel
 */
export const cancelStudentInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const cancelledBy = req.user?.id;

    const result = await cancelStudentInvitationService(id, instituteId, cancelledBy);

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
 * Body: token
 */
export const acceptStudentInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    const result = await acceptStudentInvitationService(token, userId);

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
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    const result = await resendStudentInvitationService(id, instituteId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Resend Student Invitation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};