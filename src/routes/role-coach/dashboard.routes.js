import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachDashboard,
} from "../../controllers/role-coach/dashboard.controller.js";

const router = express.Router();

router.get(
  "/",
  verifyToken,
  getCoachDashboard
);

export default router;