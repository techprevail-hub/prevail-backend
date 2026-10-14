
import { Router } from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachReviews,
  getCoachReviewsSummary,
} from "../../controllers/role-coach/reviews.controller.js";

const router = Router();

router.get("/summary", verifyToken, getCoachReviewsSummary);
router.get("/", verifyToken, getCoachReviews);

export default router;
