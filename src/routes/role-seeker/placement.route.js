import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getStudentPlacement,
  saveStudentPlacement,
  updateStudentPlacement,
} from "../../controllers/role-seeker/placement.controller.js";

const router = express.Router();

/**
 * GET /api/role-seeker/placement
 *
 * Get logged-in student's:
 * - name
 * - course
 * - branch
 * - placement details
 */
router.get(
  "/",
  verifyToken,
  getStudentPlacement
);

/**
 * POST /api/role-seeker/placement
 *
 * Create placement details.
 */
router.post(
  "/",
  verifyToken,
  saveStudentPlacement
);

/**
 * PUT /api/role-seeker/placement
 *
 * Update placement details.
 */
router.put(
  "/",
  verifyToken,
  updateStudentPlacement
);

export default router;