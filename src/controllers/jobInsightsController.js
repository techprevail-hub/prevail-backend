import { getJobInsightsService } from "../services/job-insights/jobInsightsService.js";

// --------------------------------------------------
// Get Job Insights
// --------------------------------------------------
export const getJobInsights = async (req, res) => {
  try {
    // --------------------------------------------------
    // Query Parameters
    // --------------------------------------------------
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    // Search keyword (Role / Job Title)
    const search =
      req.query.search || "software developer";

    // --------------------------------------------------
    // Fetch Job Insights
    // --------------------------------------------------
    const data = await getJobInsightsService(
      page,
      limit,
      search
    );

    // --------------------------------------------------
    // Success Response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Job insights fetched successfully.",

      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,

      jobs: data.jobs,
    });
  } catch (error) {
    console.error(
      "Job Insights Controller Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch job insights.",
    });
  }
};