import {
  getCareerPerformanceReportService,
} from "../../../services/role-institute/reports/careerPerformanceReport.js";

/**
 * GET CAREER PERFORMANCE REPORT
 */
export const getCareerPerformanceReport = async (
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
      await getCareerPerformanceReportService(
        instituteId
      );

    return res.status(200).json({
      success: true,
      message:
        "Career performance report fetched successfully.",
      data,
    });

  } catch (error) {
    console.error(
      "❌ getCareerPerformanceReport controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch career performance report.",
    });
  }
};