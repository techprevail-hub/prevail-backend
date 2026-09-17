import express from "express";
import {
  getInstituteDashboardController,
} from "../../controllers/role-institute/dashboard.controller.js";
import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();

/**
 * GET /api/role-institute/dashboard
 * Get institute dashboard data
 */
router.get(
  "/",
  verifyToken,
  getInstituteDashboardController
);

export default router;