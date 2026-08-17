// src/controllers/role-institute/inviteCoach.controller.js

import {
  getCoachInvitationsService,
  getCoachInvitationByIdService,
  createCoachInvitationService,
  generateCoachInvitationTemplateService,
  createBulkCoachInvitationsService,
  updateCoachInvitationService,
  cancelCoachInvitationService,
  resendCoachInvitationService,
  acceptCoachInvitationService,
} from "../../services/role-institute/inviteCoach.service.js";

// ─── Import Notification Service ──────────────────────────────────────────
import { createNotificationService } from "../../services/notificationService.js";

/**
 * Get All Coach Invitations
 * GET /api/coach-invitations
 */
export const getCoachInvitations = async (req, res) => {
  try {
    console.log("📋 [getCoachInvitations] REQ.USER =>", req.user);
    console.log("📋 [getCoachInvitations] Request Query:", req.query);

    const instituteId = req.user?.id;
    const userId = req.user?.id;

    console.log("📋 [getCoachInvitations] Institute ID:", instituteId);
    console.log("📋 [getCoachInvitations] User ID:", userId);

    const result = await getCoachInvitationsService({
      ...req.query,
      instituteId,
      invitedBy: userId,
    });

    console.log("📋 [getCoachInvitations] Success - Found:", result.data?.length || 0, "invitations");
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [getCoachInvitations] Error:", error);
    console.error("❌ [getCoachInvitations] Error Message:", error.message);
    console.error("❌ [getCoachInvitations] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Get Coach Invitation By ID
 * GET /api/coach-invitations/:id
 */
export const getCoachInvitationById = async (req, res) => {
  try {
    console.log("📋 [getCoachInvitationById] REQ.USER =>", req.user);
    console.log("📋 [getCoachInvitationById] Invitation ID:", req.params.id);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [getCoachInvitationById] Institute ID:", instituteId);

    const result = await getCoachInvitationByIdService(
      id,
      instituteId
    );

    console.log("📋 [getCoachInvitationById] Success - Found invitation:", result.data?.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [getCoachInvitationById] Error:", error);
    console.error("❌ [getCoachInvitationById] Error Message:", error.message);
    console.error("❌ [getCoachInvitationById] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Create Coach Invitation
 * POST /api/coach-invitations
 */
export const createCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [createCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [createCoachInvitation] Request Body:", req.body);

    const instituteId = req.user?.id;
    const invitedBy = req.user?.id;

    console.log("📋 [createCoachInvitation] Institute ID:", instituteId);
    console.log("📋 [createCoachInvitation] Invited By:", invitedBy);

    const result = await createCoachInvitationService({
      ...req.body,
      instituteId,
      invitedBy,
    });

    console.log("📋 [createCoachInvitation] Success - Created invitation for:", req.body.email);

    // ─── Create Notification for Coach ────────────────────────────────────
    if (result.success && result.data) {
      try {
        const instituteName = req.user?.institute_name || "An institute";

        await createNotificationService(
          result.data.coach_id,
          `Invitation to Join as Coach at ${instituteName}`,
          `You have been invited to join ${instituteName} as a career coach. Click to accept your invitation.`,
          "connection",
          "invitation",
          `/accept-invitation?token=${result.data.invitation_token}`
        );

        await createNotificationService(
          req.user.id,
          `Coach Invitation Sent`,
          `Your invitation to ${req.body.email} as a coach has been sent successfully.`,
          "success",
          "invitation_sent",
          `/dashboard/institute/coaches`
        );

      } catch (notifError) {
        console.error("Error creating coach invitation notification:", notifError);
      }
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("❌ [createCoachInvitation] Error:", error);
    console.error("❌ [createCoachInvitation] Error Message:", error.message);
    console.error("❌ [createCoachInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * ✅ NEW: Download Coach Invitation Excel Template
 * GET /api/coach-invitations/template
 */
export const downloadCoachInvitationTemplate = async (req, res) => {
  try {
    console.log("📋 [downloadCoachInvitationTemplate] STARTED");

    const buffer = await generateCoachInvitationTemplateService();

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="coach-invitation-template.xlsx"'
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    console.log("📋 [downloadCoachInvitationTemplate] Template generated successfully");

    return res.status(200).send(buffer);

  } catch (error) {
    console.error("❌ [downloadCoachInvitationTemplate] Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate coach invitation template.",
    });
  }
};

/**
 * ✅ NEW: Create Bulk Coach Invitations from Excel
 * POST /api/coach-invitations/bulk
 */
export const createBulkCoachInvitations = async (req, res) => {
  try {
    console.log("📋 [createBulkCoachInvitations] STARTED");
    console.log("📋 [createBulkCoachInvitations] REQ.USER =>", req.user);
    console.log("📋 [createBulkCoachInvitations] FILE =>", req.file?.originalname);

    const instituteId = req.user?.id;
    const invitedBy = req.user?.id;

    // Check authentication
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute authentication is required.",
      });
    }

    // Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file.",
      });
    }

    const result = await createBulkCoachInvitationsService({
      fileBuffer: req.file.buffer,
      instituteId,
      invitedBy,
    });

    console.log("📋 [createBulkCoachInvitations] COMPLETED");
    console.log("📋 Bulk Result:", result.data);

    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ [createBulkCoachInvitations] Error:", error);
    console.error("❌ Error Message:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process bulk coach invitations.",
    });
  }
};

/**
 * Update Coach Invitation
 * PUT /api/coach-invitations/:id
 */
export const updateCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [updateCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [updateCoachInvitation] Invitation ID:", req.params.id);
    console.log("📋 [updateCoachInvitation] Request Body:", req.body);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [updateCoachInvitation] Institute ID:", instituteId);

    const result = await updateCoachInvitationService(id, {
      ...req.body,
      instituteId,
    });

    console.log("📋 [updateCoachInvitation] Success - Updated invitation:", id);

    if (result.success && result.data) {
      try {
        await createNotificationService(
          req.user.id,
          `Coach Invitation Updated`,
          `Your invitation to ${result.data.email || 'coach'} has been updated successfully.`,
          "system",
          "invitation_updated",
          `/dashboard/institute/coaches`
        );
      } catch (notifError) {
        console.error("Error creating update notification:", notifError);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [updateCoachInvitation] Error:", error);
    console.error("❌ [updateCoachInvitation] Error Message:", error.message);
    console.error("❌ [updateCoachInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Cancel Coach Invitation
 * PATCH /api/coach-invitations/:id/cancel
 */
export const cancelCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [cancelCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [cancelCoachInvitation] Invitation ID:", req.params.id);

    const { id } = req.params;
    const instituteId = req.user?.id;
    const cancelledBy = req.user?.id;

    console.log("📋 [cancelCoachInvitation] Institute ID:", instituteId);
    console.log("📋 [cancelCoachInvitation] Cancelled By:", cancelledBy);

    const invitationDetails = await getCoachInvitationByIdService(id, instituteId);
    const email = invitationDetails.success && invitationDetails.data 
      ? invitationDetails.data.email 
      : 'coach';

    const result = await cancelCoachInvitationService(
      id,
      instituteId,
      cancelledBy
    );

    console.log("📋 [cancelCoachInvitation] Success - Cancelled invitation:", id);

    if (result.success) {
      try {
        await createNotificationService(
          req.user.id,
          `Coach Invitation Cancelled`,
          `Your invitation to ${email} has been cancelled successfully.`,
          "system",
          "invitation_cancelled",
          `/dashboard/institute/coaches`
        );
      } catch (notifError) {
        console.error("Error creating cancellation notification:", notifError);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [cancelCoachInvitation] Error:", error);
    console.error("❌ [cancelCoachInvitation] Error Message:", error.message);
    console.error("❌ [cancelCoachInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Accept Coach Invitation
 * POST /api/coach-invitations/accept
 */
export const acceptCoachInvitation = async (req, res) => {
  try {
    console.log("═══════════════════════════════════════");
    console.log("📋 [acceptCoachInvitation] STARTED");
    console.log("═══════════════════════════════════════");
    
    console.log("📋 [acceptCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [acceptCoachInvitation] REQ.USER.ID =>", req.user?.id);
    console.log("📋 [acceptCoachInvitation] REQ.USER.EMAIL =>", req.user?.email);
    console.log("📋 [acceptCoachInvitation] REQ.BODY =>", req.body);
    console.log("📋 [acceptCoachInvitation] Token from body:", req.body.token);

    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error("❌ [acceptCoachInvitation] User ID is missing - Authentication failed");
      
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please log in.",
      });
    }

    if (!token) {
      console.error("❌ [acceptCoachInvitation] Token is missing from request body");
      
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    console.log("✅ [acceptCoachInvitation] User ID:", userId);
    console.log("✅ [acceptCoachInvitation] Token:", token);
    console.log("✅ [acceptCoachInvitation] Calling service...");

    const result = await acceptCoachInvitationService(
      token,
      userId
    );

    console.log("✅ [acceptCoachInvitation] Service returned:", result);
    console.log("═══════════════════════════════════════");
    console.log("📋 [acceptCoachInvitation] SUCCESS");
    console.log("═══════════════════════════════════════");

    if (result.success && result.data) {
      try {
        const instituteId = result.data.institute_id;
        if (instituteId) {
          await createNotificationService(
            instituteId,
            `Coach Accepted Invitation`,
            `${result.data.coach_name || 'A coach'} has accepted your invitation and joined as a career coach.`,
            "success",
            "invitation_accepted",
            `/dashboard/institute/coaches`
          );
        }

        await createNotificationService(
          userId,
          `Welcome as a Career Coach!`,
          `You have successfully accepted the invitation and are now a career coach. Welcome aboard!`,
          "success",
          "welcome",
          `/dashboard/coach`
        );

      } catch (notifError) {
        console.error("Error creating acceptance notification:", notifError);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("═══════════════════════════════════════");
    console.error("❌ [acceptCoachInvitation] ERROR");
    console.error("═══════════════════════════════════════");
    console.error("❌ [acceptCoachInvitation] Error Name:", error.name);
    console.error("❌ [acceptCoachInvitation] Error Message:", error.message);
    console.error("❌ [acceptCoachInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Resend Coach Invitation
 * POST /api/coach-invitations/:id/resend
 */
export const resendCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [resendCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [resendCoachInvitation] Invitation ID:", req.params.id);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [resendCoachInvitation] Institute ID:", instituteId);

    const invitationDetails = await getCoachInvitationByIdService(id, instituteId);
    const email = invitationDetails.success && invitationDetails.data 
      ? invitationDetails.data.email 
      : 'coach';

    const result = await resendCoachInvitationService(
      id,
      instituteId
    );

    console.log("📋 [resendCoachInvitation] Success - Resent invitation:", id);

    if (result.success) {
      try {
        if (result.data && result.data.coach_id) {
          await createNotificationService(
            result.data.coach_id,
            `Invitation Reminder`,
            `You have received a new invitation to join as a career coach. Please check your email and accept the invitation.`,
            "connection",
            "invitation_reminder",
            `/accept-invitation?token=${result.data.invitation_token}`
          );
        }

        await createNotificationService(
          req.user.id,
          `Coach Invitation Resent`,
          `Your invitation to ${email} as a coach has been resent successfully.`,
          "success",
          "invitation_resent",
          `/dashboard/institute/coaches`
        );

      } catch (notifError) {
        console.error("Error creating resend notification:", notifError);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ [resendCoachInvitation] Error:", error);
    console.error("❌ [resendCoachInvitation] Error Message:", error.message);
    console.error("❌ [resendCoachInvitation] Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};