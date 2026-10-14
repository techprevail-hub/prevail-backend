
import {
  getCoachReviewsService,
  getCoachReviewsSummaryService,
} from "../../services/role-coach/reviews.service.js";

const getCoachId = (req) =>
  req.user?.id || req.user?.userId || req.user?.user?.id;

export const getCoachReviews = async (req, res) => {
  try {
    const coachId = getCoachId(req);

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const data = await getCoachReviewsService({
      coachId,
      page: req.query.page,
      limit: req.query.limit,
      rating: req.query.rating,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Coach reviews fetched successfully",
      data,
    });
  } catch (error) {
    const statusCode =
      error.message?.includes("Rating must be") ? 400 : 500;

    console.error("Get coach reviews error:", error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch coach reviews",
    });
  }
};

export const getCoachReviewsSummary = async (req, res) => {
  try {
    const coachId = getCoachId(req);

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const data = await getCoachReviewsSummaryService({
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Coach reviews summary fetched successfully",
      data,
    });
  } catch (error) {
    console.error(
      "Get coach reviews summary error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch reviews summary",
    });
  }
};
