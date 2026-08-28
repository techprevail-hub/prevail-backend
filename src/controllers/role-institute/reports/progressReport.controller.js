import {
  getProgressReportService,
} from "../../../services/role-institute/reports/progressReport.service.js";

/**
 * GET PROGRESS REPORT
 */
export const getProgressReport = async (
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

    const data = await getProgressReportService(
      instituteId
    );

    return res.status(200).json({
      success: true,
      message: "Progress report fetched successfully.",
      data,
    });

  } catch (error) {
    console.error(
      "❌ getProgressReport controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch progress report.",
    });
  }
};