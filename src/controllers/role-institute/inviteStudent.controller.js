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
    console.log("📋 [getStudentInvitations] REQ.USER =>", req.user);
    console.log("📋 [getStudentInvitations] Request Query:", req.query);

    const instituteId = req.user?.id;
    const userId = req.user?.id;

    console.log("📋 [getStudentInvitations] Institute ID:", instituteId);
    console.log("📋 [getStudentInvitations] User ID:", userId);

    const result = await getStudentInvitationsService({
      ...req.query,
      instituteId,
      invitedBy: userId,
    });

    console.log("📋 [getStudentInvitations] Success - Found:", result.data?.length || 0, "invitations");
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [getStudentInvitations] Error:", error);
    console.error("❌ [getStudentInvitations] Error Message:", error.message);
    console.error("❌ [getStudentInvitations] Error Stack:", error.stack);

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
    console.log("📋 [getStudentInvitationById] REQ.USER =>", req.user);
    console.log("📋 [getStudentInvitationById] Invitation ID:", req.params.id);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [getStudentInvitationById] Institute ID:", instituteId);

    const result = await getStudentInvitationByIdService(
      id,
      instituteId
    );

    console.log("📋 [getStudentInvitationById] Success - Found invitation:", result.data?.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [getStudentInvitationById] Error:", error);
    console.error("❌ [getStudentInvitationById] Error Message:", error.message);
    console.error("❌ [getStudentInvitationById] Error Stack:", error.stack);

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
    console.log("📋 [createStudentInvitation] REQ.USER =>", req.user);
    console.log("📋 [createStudentInvitation] Request Body:", req.body);

    const instituteId = req.user?.id;
    const invitedBy = req.user?.id;

    console.log("📋 [createStudentInvitation] Institute ID:", instituteId);
    console.log("📋 [createStudentInvitation] Invited By:", invitedBy);

    const result = await createStudentInvitationService({
      ...req.body,
      instituteId,
      invitedBy,
    });

    console.log("📋 [createStudentInvitation] Success - Created invitation for:", req.body.email);
    return res.status(201).json(result);
  } catch (error) {
    console.error("❌ [createStudentInvitation] Error:", error);
    console.error("❌ [createStudentInvitation] Error Message:", error.message);
    console.error("❌ [createStudentInvitation] Error Stack:", error.stack);

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
    console.log("📋 [updateStudentInvitation] REQ.USER =>", req.user);
    console.log("📋 [updateStudentInvitation] Invitation ID:", req.params.id);
    console.log("📋 [updateStudentInvitation] Request Body:", req.body);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [updateStudentInvitation] Institute ID:", instituteId);

    const result = await updateStudentInvitationService(id, {
      ...req.body,
      instituteId,
    });

    console.log("📋 [updateStudentInvitation] Success - Updated invitation:", id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [updateStudentInvitation] Error:", error);
    console.error("❌ [updateStudentInvitation] Error Message:", error.message);
    console.error("❌ [updateStudentInvitation] Error Stack:", error.stack);

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
    console.log("📋 [cancelStudentInvitation] REQ.USER =>", req.user);
    console.log("📋 [cancelStudentInvitation] Invitation ID:", req.params.id);

    const { id } = req.params;

    const instituteId = req.user?.id;
    const cancelledBy = req.user?.id;

    console.log("📋 [cancelStudentInvitation] Institute ID:", instituteId);
    console.log("📋 [cancelStudentInvitation] Cancelled By:", cancelledBy);

    const result = await cancelStudentInvitationService(
      id,
      instituteId,
      cancelledBy
    );

    console.log("📋 [cancelStudentInvitation] Success - Cancelled invitation:", id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [cancelStudentInvitation] Error:", error);
    console.error("❌ [cancelStudentInvitation] Error Message:", error.message);
    console.error("❌ [cancelStudentInvitation] Error Stack:", error.stack);

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
    console.log("═══════════════════════════════════════");
    console.log("📋 [acceptStudentInvitation] STARTED");
    console.log("═══════════════════════════════════════");
    
    console.log("📋 [acceptStudentInvitation] REQ.USER =>", req.user);
    console.log("📋 [acceptStudentInvitation] REQ.USER.ID =>", req.user?.id);
    console.log("📋 [acceptStudentInvitation] REQ.USER.EMAIL =>", req.user?.email);
    console.log("📋 [acceptStudentInvitation] REQ.BODY =>", req.body);
    console.log("📋 [acceptStudentInvitation] Token from body:", req.body.token);

    const { token } = req.body;
    const userId = req.user?.id;

    // ✅ Check if user is authenticated
    if (!userId) {
      console.error("❌ [acceptStudentInvitation] User ID is missing - Authentication failed");
      console.log("📋 [acceptStudentInvitation] req.user:", req.user);
      console.log("📋 [acceptStudentInvitation] req.headers:", req.headers?.authorization);
      
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please log in.",
      });
    }

    // ✅ Check if token is provided
    if (!token) {
      console.error("❌ [acceptStudentInvitation] Token is missing from request body");
      console.log("📋 [acceptStudentInvitation] Request body:", req.body);
      
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    console.log("✅ [acceptStudentInvitation] User ID:", userId);
    console.log("✅ [acceptStudentInvitation] Token:", token);
    console.log("✅ [acceptStudentInvitation] Calling service...");

    // Call the service with token and userId
    const result = await acceptStudentInvitationService(
      token,
      userId
    );

    console.log("✅ [acceptStudentInvitation] Service returned:", result);
    console.log("═══════════════════════════════════════");
    console.log("📋 [acceptStudentInvitation] SUCCESS");
    console.log("═══════════════════════════════════════");

    return res.status(200).json(result);
  } catch (error) {
    console.error("═══════════════════════════════════════");
    console.error("❌ [acceptStudentInvitation] ERROR");
    console.error("═══════════════════════════════════════");
    console.error("❌ [acceptStudentInvitation] Error Name:", error.name);
    console.error("❌ [acceptStudentInvitation] Error Message:", error.message);
    console.error("❌ [acceptStudentInvitation] Error Stack:", error.stack);
    console.error("❌ [acceptStudentInvitation] Full Error:", error);

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
    console.log("📋 [resendStudentInvitation] REQ.USER =>", req.user);
    console.log("📋 [resendStudentInvitation] Invitation ID:", req.params.id);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [resendStudentInvitation] Institute ID:", instituteId);

    const result = await resendStudentInvitationService(
      id,
      instituteId
    );

    console.log("📋 [resendStudentInvitation] Success - Resent invitation:", id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [resendStudentInvitation] Error:", error);
    console.error("❌ [resendStudentInvitation] Error Message:", error.message);
    console.error("❌ [resendStudentInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};