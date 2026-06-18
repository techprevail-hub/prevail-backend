import express from "express";
import { getJobInsights } from "../controllers/jobInsightsController.js";

const router = express.Router();

// GET /api/job-insights
router.get("/", getJobInsights);

export default router;