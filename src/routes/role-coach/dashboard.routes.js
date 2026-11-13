
import express from "express";

import {
  getCoachDashboard,
} from "../../controllers/role-coach/dashboard.controller.js";

import {
  validateCoachDashboard,
} from "../../validations/role-coach/dashboard.validation.js";

const router = express.Router();

router.get(
  "/",
  validateCoachDashboard,
  getCoachDashboard
);

export default router;
