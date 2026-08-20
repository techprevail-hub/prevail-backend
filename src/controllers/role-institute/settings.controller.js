import {
  getInstituteSettingsService,
  updateInstituteNotificationSettingsService,
  updateInstituteFeatureSettingsService,
} from "../../services/role-institute/settings.service.js";

/**
 * GET INSTITUTE SETTINGS
 */
export const getInstituteSettings = async (req, res) => {
  try {
    /**
     * Use the authenticated institute ID.
     *
     * IMPORTANT:
     * This assumes req.user.id is the institute ID.
     * If your project gets the institute ID differently,
     * change only this line.
     */
    const instituteId = req.user.id;

    const data =
      await getInstituteSettingsService(
        instituteId
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "❌ Get institute settings controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch institute settings.",
    });
  }
};

/**
 * UPDATE INSTITUTE NOTIFICATION SETTINGS
 */
export const updateInstituteNotificationSettings =
  async (req, res) => {
    try {
      const instituteId = req.user.id;

      const {
        notificationSettings,
      } = req.body;

      const data =
        await updateInstituteNotificationSettingsService(
          instituteId,
          notificationSettings
        );

      return res.status(200).json({
        success: true,
        message:
          "Notification settings updated successfully.",
        data,
      });
    } catch (error) {
      console.error(
        "❌ Update notification settings controller error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update notification settings.",
      });
    }
  };

/**
 * UPDATE INSTITUTE FEATURE SETTINGS
 */
export const updateInstituteFeatureSettings =
  async (req, res) => {
    try {
      const instituteId = req.user.id;

      const {
        featureSettings,
      } = req.body;

      const data =
        await updateInstituteFeatureSettingsService(
          instituteId,
          featureSettings
        );

      return res.status(200).json({
        success: true,
        message:
          "Feature settings updated successfully.",
        data,
      });
    } catch (error) {
      console.error(
        "❌ Update feature settings controller error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update feature settings.",
      });
    }
  };