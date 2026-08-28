import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getProgressReport,
} from "../../controllers/role-institute/reports/progressReport.controller.js";

const router = express.Router();

/**
 * Progress Report Routes
 */

// Get progress report
router.get(
  "/",
  verifyToken,
  getProgressReport
);

export default router;