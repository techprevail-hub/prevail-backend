import {
  getCoachDashboardService,
} from "../../services/role-coach/dashboard.service.js";

/* -------------------------------------------------------------------------- */
/* GET COACH DASHBOARD                                                        */
/* -------------------------------------------------------------------------- */

export const getCoachDashboard = async (req, res) => {
  try {
    // Get authenticated user ID from verifyToken middleware
    const coachId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Coach ID not found.",
      });
    }

    // Fetch dashboard data
    const data = await getCoachDashboardService({
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Coach dashboard fetched successfully.",
      data,
    });

  } catch (error) {
    console.error("Get coach dashboard error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Failed to fetch coach dashboard.",
    });
  }
};