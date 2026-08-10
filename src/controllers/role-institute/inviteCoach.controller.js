// src/controllers/role-institute/inviteCoach.controller.js

import {
  getCoachInvitationsService,
  getCoachInvitationByIdService,
  createCoachInvitationService,
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
 * 
 * Request Body:
 * - coachName: string (required)
 * - email: string (required)
 * - specialization: string (required)
 * - experience: string (required)
 */
export const createCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [createCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [createCoachInvitation] Request Body:", req.body);

    const instituteId = req.user?.id;
    const invitedBy = req.user?.id;

    console.log("📋 [createCoachInvitation] Institute ID:", instituteId);
    console.log("📋 [createCoachInvitation] Invited By:", invitedBy);

    // Validate required fields
    const { coachName, email, specialization, experience } = req.body;
    
    if (!coachName) {
      return res.status(400).json({
        success: false,
        message: "Coach name is required",
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    
    if (!specialization) {
      return res.status(400).json({
        success: false,
        message: "Specialization is required",
      });
    }
    
    if (!experience) {
      return res.status(400).json({
        success: false,
        message: "Experience is required",
      });
    }

    const result = await createCoachInvitationService({
      coachName,
      email,
      specialization,
      experience,
      instituteId,
      invitedBy,
      expiryDays: req.body.expiryDays || 7,
    });

    console.log("📋 [createCoachInvitation] Success - Created invitation for:", email);

    // ─── Create Notification for Coach ────────────────────────────────────
    if (result.success && result.data) {
      try {
        // Get institute name for notification
        const instituteName = req.user?.institute_name || "An institute";

        // Notification for the invited coach
        await createNotificationService(
          result.data.coach_id, // The coach's user ID
          `Invitation to Join as Coach at ${instituteName}`,
          `You have been invited to join ${instituteName} as a career coach. Click to accept your invitation.`,
          "connection",
          "invitation",
          `/accept-invitation?token=${result.data.invitation_token}`
        );

        // Notification for the institute admin (confirmation)
        await createNotificationService(
          req.user.id,
          `Coach Invitation Sent`,
          `Your invitation to ${email} as a coach has been sent successfully.`,
          "success",
          "invitation_sent",
          `/dashboard/institute/coaches`
        );

      } catch (notifError) {
        console.error("Error creating coach invitation notification:", notifError);
        // Don't block the main flow if notification fails
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
 * Update Coach Invitation
 * PUT /api/coach-invitations/:id
 * 
 * Request Body (optional fields):
 * - coachName: string
 * - email: string
 * - specialization: string
 * - experience: string
 */
export const updateCoachInvitation = async (req, res) => {
  try {
    console.log("📋 [updateCoachInvitation] REQ.USER =>", req.user);
    console.log("📋 [updateCoachInvitation] Invitation ID:", req.params.id);
    console.log("📋 [updateCoachInvitation] Request Body:", req.body);

    const { id } = req.params;
    const instituteId = req.user?.id;

    console.log("📋 [updateCoachInvitation] Institute ID:", instituteId);

    // Check if at least one field is provided for update
    const { coachName, email, specialization, experience } = req.body;
    
    if (!coachName && !email && !specialization && !experience) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided for update",
      });
    }

    const result = await updateCoachInvitationService(id, {
      coachName,
      email,
      specialization,
      experience,
      instituteId,
    });

    console.log("📋 [updateCoachInvitation] Success - Updated invitation:", id);

    // ─── Create Notification for Update ──────────────────────────────────
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
        // Don't block the main flow if notification fails
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

    // Get invitation details before cancellation for notification
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

    // ─── Create Notification for Cancellation ────────────────────────────
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
        // Don't block the main flow if notification fails
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
 * 
 * Request Body:
 * - token: string (required)
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

    // ✅ Check if user is authenticated
    if (!userId) {
      console.error("❌ [acceptCoachInvitation] User ID is missing - Authentication failed");
      console.log("📋 [acceptCoachInvitation] req.user:", req.user);
      console.log("📋 [acceptCoachInvitation] req.headers:", req.headers?.authorization);
      
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please log in.",
      });
    }

    // ✅ Check if token is provided
    if (!token) {
      console.error("❌ [acceptCoachInvitation] Token is missing from request body");
      console.log("📋 [acceptCoachInvitation] Request body:", req.body);
      
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    console.log("✅ [acceptCoachInvitation] User ID:", userId);
    console.log("✅ [acceptCoachInvitation] Token:", token);
    console.log("✅ [acceptCoachInvitation] Calling service...");

    // Call the service with token and userId
    const result = await acceptCoachInvitationService(
      token,
      userId
    );

    console.log("✅ [acceptCoachInvitation] Service returned:", result);
    console.log("═══════════════════════════════════════");
    console.log("📋 [acceptCoachInvitation] SUCCESS");
    console.log("═══════════════════════════════════════");

    // ─── Create Notification for Acceptance ──────────────────────────────
    if (result.success && result.data) {
      try {
        // Notification to the institute admin
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

        // Notification to the coach (confirmation)
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
        // Don't block the main flow if notification fails
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
    console.error("❌ [acceptCoachInvitation] Full Error:", error);

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

    // Get invitation details before resending
    const invitationDetails = await getCoachInvitationByIdService(id, instituteId);
    const email = invitationDetails.success && invitationDetails.data 
      ? invitationDetails.data.email 
      : 'coach';

    const result = await resendCoachInvitationService(
      id,
      instituteId
    );

    console.log("📋 [resendCoachInvitation] Success - Resent invitation:", id);

    // ─── Create Notification for Resend ──────────────────────────────────
    if (result.success) {
      try {
        // Notification to the coach
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

        // Notification to the institute admin (confirmation)
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
        // Don't block the main flow if notification fails
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