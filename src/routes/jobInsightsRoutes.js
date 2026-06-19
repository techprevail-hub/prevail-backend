import express from "express";
import { getJobInsights } from "../controllers/jobInsightsController.js";

const router = express.Router();

router.get("/", getJobInsights);

export default router;