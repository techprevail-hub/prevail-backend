import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getPlacementReport,
} from "../../controllers/role-institute/reports/placementReport.controller.js";

const router = express.Router();

/**
 * Placement Report Routes
 */

// Get placement report
router.get(
  "/",
  verifyToken,
  getPlacementReport
);

export default router;