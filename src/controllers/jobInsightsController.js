import { getJobInsightsService } from "../services/job-insights/jobInsightsService.js";

export const getJobInsights = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const data = await getJobInsightsService(page, limit);

    return res.status(200).json({
      success: true,
      message: "Job insights fetched successfully.",

      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,

      jobs: data.jobs
    });

  } catch (error) {
    console.error("Job Insights Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch job insights.",
    });
  }
};