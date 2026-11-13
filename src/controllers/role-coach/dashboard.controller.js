
import {
  getCoachDashboardService,
} from "../../services/role-coach/dashboard.service.js";

/* -------------------------------------------------------------------------- */
/* GET /dashboard                                                             */
/* -------------------------------------------------------------------------- */

export const getCoachDashboard = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const dashboard = await getCoachDashboardService({
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Coach dashboard fetched successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("Get coach dashboard error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to fetch coach dashboard",
    });
  }
};
