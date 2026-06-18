import { getJobInsightsService } from "../services/job-insights/jobInsightsService.js";

export const getJobInsights = async (req, res) => {
  try {
    const data = await getJobInsightsService();

    return res.status(200).json({
      success: true,
      message: "Job insights fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Job Insights Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch job insights.",
    });
  }
};