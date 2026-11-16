
import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachDashboard,
} from "../../controllers/role-coach/dashboard.controller.js";

/* -------------------------------------------------------------------------- */
/* COACH DASHBOARD ROUTES                                                     */
/* -------------------------------------------------------------------------- */

const router = express.Router();

/**
 * GET /api/role-coach/dashboard
 *
 * Fetch authenticated coach dashboard data.
 *
 * Middleware:
 * 1. verifyToken - verifies authentication.
 * 2. getCoachDashboard - fetches dashboard data.
 */

router.get(
  "/",
  verifyToken,
  getCoachDashboard
);

export default router;
