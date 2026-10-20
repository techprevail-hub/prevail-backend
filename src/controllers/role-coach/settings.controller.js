
import {
  getCoachSettingsService,
  updateCoachNotificationSettingsService,
  updateCoachSessionPreferencesService,
  updateCoachGeneralPreferencesService,
} from "../../services/role-coach/settings.service.js";

import {
  validateNotificationSettings,
  validateSessionPreferences,
  validateGeneralPreferences,
} from "../../validations/role-coach/settings.validation.js";

/* -------------------------------------------------------------------------- */
/* GET COACH SETTINGS                                                         */
/* -------------------------------------------------------------------------- */

export const getCoachSettings = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const settings = await getCoachSettingsService({ coachId });

    return res.status(200).json({
      success: true,
      message: "Coach settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get coach settings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch coach settings",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE NOTIFICATION PREFERENCES                                            */
/* -------------------------------------------------------------------------- */

export const updateCoachNotificationSettings = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const errors = validateNotificationSettings(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const settings = await updateCoachNotificationSettingsService({
      coachId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update coach notification settings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update notification preferences",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE SESSION PREFERENCES                                                 */
/* -------------------------------------------------------------------------- */

export const updateCoachSessionPreferences = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const errors = validateSessionPreferences(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const settings = await updateCoachSessionPreferencesService({
      coachId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Session preferences updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update coach session preferences error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update session preferences",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE GENERAL PREFERENCES                                                 */
/* -------------------------------------------------------------------------- */

export const updateCoachGeneralPreferences = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const errors = validateGeneralPreferences(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const settings = await updateCoachGeneralPreferencesService({
      coachId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "General preferences updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update coach general preferences error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update general preferences",
    });
  }
};
