import {
  getSettingsService,
  updateNotificationsService,
  updatePreferencesService,
} from "../services/settingsService.js";


// GET SETTINGS

export const getSettings = async (req, res) => {

  try {

    const userId = req.user.id;

    const data = await getSettingsService(userId);

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


// UPDATE NOTIFICATIONS

export const updateNotifications = async (
  req,
  res
) => {

  try {

    const userId = req.user.id;

    const data =
      await updateNotificationsService(
        userId,
        req.body.notifications
      );

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


// UPDATE PREFERENCES

export const updatePreferences = async (
  req,
  res
) => {

  try {

    const userId = req.user.id;

    const data =
      await updatePreferencesService(
        userId,
        req.body.preferences
      );

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};