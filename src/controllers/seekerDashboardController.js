import { getDashboardData } from "../services/seekerDashboardService.js";

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const dashboardData = await getDashboardData(userId);

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};