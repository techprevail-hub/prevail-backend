// src/controllers/role-coach/session.controller.js

import {
  getCoachSessionsService,
  getCoachSessionByIdService,
  updateCoachSessionStatusService,
  rescheduleCoachSessionService,
  cancelCoachSessionService,
  getCoachSessionNotesService,
  updateCoachSessionNotesService,
} from "../../services/role-coach/session.service.js";

const getCoachId = (req) =>
  req.user?.id;

export const getCoachSessions = async (
  req,
  res
) => {
  try {
    const coachId = getCoachId(req);

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const result =
      await getCoachSessionsService({
        coachId,
        status: req.query.status || null,
      });

    return res.status(200).json({
      success: true,
      message:
        "Sessions fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Get coach sessions error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch sessions",
    });
  }
};

export const getCoachSessionById = async (
  req,
  res
) => {
  try {
    const coachId = getCoachId(req);

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const data =
      await getCoachSessionByIdService({
        coachId,
        sessionId: req.params.sessionId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Session fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch session",
    });
  }
};

export const updateCoachSessionStatus =
  async (req, res) => {
    try {
      const coachId = getCoachId(req);

      if (!coachId) {
        return res.status(401).json({
          success: false,
          message:
            "User not authenticated",
        });
      }

      const data =
        await updateCoachSessionStatusService(
          {
            coachId,
            sessionId:
              req.params.sessionId,
            status: req.body.status,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Session status updated successfully",
        data,
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to update session status",
      });
    }
  };

export const rescheduleCoachSession =
  async (req, res) => {
    try {
      const coachId = getCoachId(req);

      if (!coachId) {
        return res.status(401).json({
          success: false,
          message:
            "User not authenticated",
        });
      }

      const data =
        await rescheduleCoachSessionService(
          {
            coachId,
            sessionId:
              req.params.sessionId,
            sessionDate:
              req.body.sessionDate,
            startTime:
              req.body.startTime,
            endTime:
              req.body.endTime,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Session rescheduled successfully",
        data,
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to reschedule session",
      });
    }
  };

export const cancelCoachSession =
  async (req, res) => {
    try {
      const coachId = getCoachId(req);

      if (!coachId) {
        return res.status(401).json({
          success: false,
          message:
            "User not authenticated",
        });
      }

      const data =
        await cancelCoachSessionService({
          coachId,
          sessionId:
            req.params.sessionId,
          reason: req.body.reason,
        });

      return res.status(200).json({
        success: true,
        message:
          "Session cancelled successfully",
        data,
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel session",
      });
    }
  };

export const getCoachSessionNotes =
  async (req, res) => {
    try {
      const coachId = getCoachId(req);

      if (!coachId) {
        return res.status(401).json({
          success: false,
          message:
            "User not authenticated",
        });
      }

      const data =
        await getCoachSessionNotesService({
          coachId,
          sessionId:
            req.params.sessionId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Session notes fetched successfully",
        data,
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch session notes",
      });
    }
  };

export const updateCoachSessionNotes =
  async (req, res) => {
    try {
      const coachId = getCoachId(req);

      if (!coachId) {
        return res.status(401).json({
          success: false,
          message:
            "User not authenticated",
        });
      }

      const data =
        await updateCoachSessionNotesService({
          coachId,
          sessionId:
            req.params.sessionId,
          notes: req.body.notes,
        });

      return res.status(200).json({
        success: true,
        message:
          "Session notes updated successfully",
        data,
      });
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to update session notes",
      });
    }
  };