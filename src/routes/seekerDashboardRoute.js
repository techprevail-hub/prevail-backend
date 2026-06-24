import express from "express";
import { getDashboard } from "../controllers/seekerDashboardController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.get(
  "/dashboard",
  verifyToken,
  getDashboard
);

export default router;