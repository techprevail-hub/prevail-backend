import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachAnalytics,
} from "../../controllers/role-coach/analytics.controller.js";

const router = express.Router();

router.get("/", verifyToken, getCoachAnalytics);

export default router;