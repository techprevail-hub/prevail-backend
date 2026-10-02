// src/routes/role-coach/session.routes.js

import express from "express";

import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachSessions,
  getCoachSessionById,
  updateCoachSessionStatus,
  rescheduleCoachSession,
  cancelCoachSession,
  getCoachSessionNotes,
  updateCoachSessionNotes,
} from "../../controllers/role-coach/session.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  getCoachSessions
);

router.get(
  "/:sessionId",
  getCoachSessionById
);

router.patch(
  "/:sessionId/status",
  updateCoachSessionStatus
);

router.patch(
  "/:sessionId/reschedule",
  rescheduleCoachSession
);

router.patch(
  "/:sessionId/cancel",
  cancelCoachSession
);

router.get(
  "/:sessionId/notes",
  getCoachSessionNotes
);

router.put(
  "/:sessionId/notes",
  updateCoachSessionNotes
);

export default router;