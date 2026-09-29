// src/routes/role-coach/availability.routes.js

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

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* WEEKLY AVAILABILITY                                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/",
  verifyToken,
  getCoachAvailability
);

router.post(
  "/",
  verifyToken,
  createCoachAvailability
);

/* -------------------------------------------------------------------------- */
/* DATE-SPECIFIC OVERRIDES                                                    */
/* -------------------------------------------------------------------------- */
/*
 * Keep /overrides routes before /:availabilityId routes
 * so "overrides" is not treated as an availability ID.
 */

router.get(
  "/overrides",
  verifyToken,
  getCoachOverrides
);

router.post(
  "/overrides",
  verifyToken,
  createCoachOverride
);

router.put(
  "/overrides/:overrideId",
  verifyToken,
  updateCoachOverride
);

router.delete(
  "/overrides/:overrideId",
  verifyToken,
  deleteCoachOverride
);

/* -------------------------------------------------------------------------- */
/* WEEKLY AVAILABILITY BY ID                                                  */
/* -------------------------------------------------------------------------- */

router.put(
  "/:availabilityId",
  verifyToken,
  updateCoachAvailability
);

router.patch(
  "/:availabilityId/status",
  verifyToken,
  toggleCoachAvailability
);

router.delete(
  "/:availabilityId",
  verifyToken,
  deleteCoachAvailability
);

export default router;