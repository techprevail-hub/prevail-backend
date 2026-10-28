
import supabase from "../../services/supabaseClient.js";

import {
  getCoachSessionsService,
  getCoachSessionByIdService,
  updateCoachSessionStatusService,
  rescheduleCoachSessionService,
  cancelCoachSessionService,
  getCoachSessionNotesService,
  updateCoachSessionNotesService,
} from "../../services/role-coach/session.service.js";

const getCoachId = (req) => req.user?.id;

// Verify authentication and application role.
// Do not modify verifyToken.js.
const ensureCoachRole = async (req, res) => {
  const coachId = getCoachId(req);

  if (!coachId) {
    res.status(401).json({
      success: false,
      message: "User not authenticated.",
    });

    return null;
  }

  const { data: appUser, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle();

  if (error) {
    console.error("Error verifying coach role:", error);

    res.status(500).json({
      success: false,
      message: "Failed to verify user role.",
    });

    return null;
  }

  if (!appUser || appUser.role !== "coach") {
    res.status(403).json({
      success: false,
      message: "Access denied. Coach role required.",
    });

    return null;
  }

  return appUser.id;
};

// GET /api/role-coach/sessions
export const getCoachSessions = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const result = await getCoachSessionsService({
      coachId,
      status: req.query.status || null,
    });

    return res.status(200).json({
      success: true,
      message: "Sessions fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Get coach sessions error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch sessions.",
    });
  }
};

// GET /api/role-coach/sessions/:sessionId
export const getCoachSessionById = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const data = await getCoachSessionByIdService({
      coachId,
      sessionId: req.params.sessionId,
    });

    return res.status(200).json({
      success: true,
      message: "Session fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Get coach session by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch session.",
    });
  }
};

// PATCH /api/role-coach/sessions/:sessionId/status


export const updateCoachSessionStatus = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const { status, reason } = req.body || {};

    const data = await updateCoachSessionStatusService({
      coachId,
      sessionId: req.params.sessionId,
      status,
      reason,
    });

    let message = "Session status updated successfully.";

    if (status === "confirmed") {
      message = "Booking request accepted successfully.";
    } else if (status === "cancelled") {
      message = "Booking request rejected or session cancelled successfully.";
    }

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    console.error("Update coach session status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update session status.",
    });
  }
};



// PATCH /api/role-coach/sessions/:sessionId/reschedule
export const rescheduleCoachSession = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const data = await rescheduleCoachSessionService({
      coachId,
      sessionId: req.params.sessionId,
      sessionDate: req.body?.sessionDate,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
    });

    return res.status(200).json({
      success: true,
      message: "Session rescheduled successfully.",
      data,
    });
  } catch (error) {
    console.error("Reschedule coach session error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reschedule session.",
    });
  }
};

// PATCH /api/role-coach/sessions/:sessionId/cancel
export const cancelCoachSession = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const data = await cancelCoachSessionService({
      coachId,
      sessionId: req.params.sessionId,
      reason: req.body?.reason,
    });

    return res.status(200).json({
      success: true,
      message: "Session cancelled successfully.",
      data,
    });
  } catch (error) {
    console.error("Cancel coach session error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to cancel session.",
    });
  }
};

// GET /api/role-coach/sessions/:sessionId/notes
export const getCoachSessionNotes = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const data = await getCoachSessionNotesService({
      coachId,
      sessionId: req.params.sessionId,
    });

    return res.status(200).json({
      success: true,
      message: "Session notes fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Get coach session notes error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch session notes.",
    });
  }
};

// PUT /api/role-coach/sessions/:sessionId/notes
export const updateCoachSessionNotes = async (req, res) => {
  try {
    const coachId = await ensureCoachRole(req, res);
    if (!coachId) return;

    const data = await updateCoachSessionNotesService({
      coachId,
      sessionId: req.params.sessionId,
      notes: req.body?.notes,
    });

    return res.status(200).json({
      success: true,
      message: "Session notes updated successfully.",
      data,
    });
  } catch (error) {
    console.error("Update coach session notes error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update session notes.",
    });
  }
};
