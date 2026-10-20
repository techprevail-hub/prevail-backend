
import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachSettings,
  updateCoachNotificationSettings,
  updateCoachSessionPreferences,
  updateCoachGeneralPreferences,
} from "../../controllers/role-coach/settings.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getCoachSettings);

router.put("/notifications", updateCoachNotificationSettings);

router.put(
  "/session-preferences",
  updateCoachSessionPreferences
);

router.put("/general", updateCoachGeneralPreferences);

export default router;
