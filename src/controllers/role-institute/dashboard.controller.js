import {
  getInstituteDashboardService,
} from "../../services/role-institute/dashboard.service.js";

/**
 * Get Institute Dashboard
 *
 * GET /api/role-institute/dashboard
 */
export const getInstituteDashboardController = async (
  req,
  res
) => {
  try {
    // ------------------------------------------------------------
    // Get institute ID from authenticated user
    // ------------------------------------------------------------
    const instituteId = req.user?.id;

    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute ID not found.",
      });
    }

    // ------------------------------------------------------------
    // Get dashboard data
    // ------------------------------------------------------------
    const dashboardData =
      await getInstituteDashboardService(
        instituteId
      );

    // ------------------------------------------------------------
    // Success response
    // ------------------------------------------------------------
    return res.status(200).json({
      success: true,
      message:
        "Institute dashboard data fetched successfully.",
      data: dashboardData,
    });
  } catch (error) {
    console.error(
      "❌ getInstituteDashboardController error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch institute dashboard data.",
    });
  }
};