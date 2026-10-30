import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachAvailability,
  createCoachAvailability,
  updateCoachAvailability,
  toggleCoachAvailability,
  deleteCoachAvailability,
  getCoachOverrides,
  createCoachOverride,
  updateCoachOverride,
  deleteCoachOverride,
} from "../../controllers/role-coach/availability.controller.js";

import {
  validateCreateAvailability,
  validateUpdateAvailability,
  validateToggleAvailability,
  validateCreateOverride,
  validateUpdateOverride,
} from "../../validations/role-coach/availability.validation.js";

const router = express.Router();

/* WEEKLY AVAILABILITY */

router.get("/", verifyToken, getCoachAvailability);

router.post(
  "/",
  verifyToken,
  validateCreateAvailability,
  createCoachAvailability
);

/* DATE-SPECIFIC OVERRIDES */

router.get("/overrides", verifyToken, getCoachOverrides);

router.post(
  "/overrides",
  verifyToken,
  validateCreateOverride,
  createCoachOverride
);

router.put(
  "/overrides/:overrideId",
  verifyToken,
  validateUpdateOverride,
  updateCoachOverride
);

router.delete(
  "/overrides/:overrideId",
  verifyToken,
  deleteCoachOverride
);

/* WEEKLY AVAILABILITY BY ID */

router.put(
  "/:availabilityId",
  verifyToken,
  validateUpdateAvailability,
  updateCoachAvailability
);

router.patch(
  "/:availabilityId/status",
  verifyToken,
  validateToggleAvailability,
  toggleCoachAvailability
);

router.delete(
  "/:availabilityId",
  verifyToken,
  deleteCoachAvailability
);

export default router;