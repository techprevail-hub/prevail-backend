import {
  getNotificationsService,
  createNotificationService,
  markAsReadService,
  markAllAsReadService,
} from "../services/notificationService.js";

// GET ALL NOTIFICATIONS
export const getNotifications = async (
  req,
  res
) => {

  try {

    const userId = req.user.id;

    const data =
      await getNotificationsService(
        userId
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

// CREATE NOTIFICATION
export const createNotification = async (
  req,
  res
) => {

  try {

    const {
      userId,
      title,
      message,
      type,
    } = req.body;

    const data =
      await createNotificationService(
        userId,
        title,
        message,
        type
      );

    return res.status(201).json({
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

// MARK SINGLE READ
export const markAsRead = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    const data =
      await markAsReadService(id);

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

// MARK ALL READ
export const markAllAsRead = async (
  req,
  res
) => {

  try {

    const userId = req.user.id;

    const data =
      await markAllAsReadService(
        userId
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