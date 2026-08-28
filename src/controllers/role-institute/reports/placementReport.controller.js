import {
  getPlacementReportService,
} from "../../../services/role-institute/reports/placementReport.service.js";

/**
 * GET PLACEMENT REPORT
 */
export const getPlacementReport = async (
  req,
  res
) => {
  try {
    const instituteId = req.user?.id;

    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Institute ID not found.",
      });
    }

    const data =
      await getPlacementReportService(
        instituteId
      );

    return res.status(200).json({
      success: true,
      message:
        "Placement report fetched successfully.",
      data,
    });

  } catch (error) {
    console.error(
      "❌ getPlacementReport controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch placement report.",
    });
  }
};