// dashboardController.js

import { calculateProgress } from "../services/progressService.js";

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const progressData =
      await calculateProgress(userId);

    res.status(200).json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};