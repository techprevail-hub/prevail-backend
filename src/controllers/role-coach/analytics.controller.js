
import { getCoachAnalyticsService } from "../../services/role-coach/analytics.service.js";

export const getCoachAnalytics = async (req, res) => {
  try {
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

    const requestedPeriod = Number(req.query.period ?? 6);

    if (![6, 12].includes(requestedPeriod)) {
      return res.status(400).json({
        success: false,
        message: "Period must be either 6 or 12 months.",
      });
    }

    const data = await getCoachAnalyticsService({
      coachId,
      period: requestedPeriod,
    });

    return res.status(200).json({
      success: true,
      message: "Coach analytics fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("Get coach analytics error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Failed to fetch coach analytics.",
    });
  }
};
