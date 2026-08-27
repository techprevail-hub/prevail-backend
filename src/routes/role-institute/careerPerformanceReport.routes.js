import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCareerPerformanceReport,
} from "../../controllers/role-institute/careerPerformanceReport.controller.js";

const router = express.Router();

/**
 * Career Performance Report Routes
 */

// Get career performance report
router.get(
  "/",
  verifyToken,
  getCareerPerformanceReport
);

export default router;