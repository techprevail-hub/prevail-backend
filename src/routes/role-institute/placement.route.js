import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getInstituteStudentPlacement,
  saveInstitutePlacement,
  updateInstitutePlacement,
} from "../../controllers/role-institute/placement.controller.js";

const router = express.Router();

/**
 * GET /api/role-institute/placement/student/:studentId
 *
 * Get placement details of a specific student.
 *
 * Institute can only access students
 * belonging to its own institute.
 */
router.get(
  "/student/:studentId",
  verifyToken,
  getInstituteStudentPlacement
);

/**
 * POST /api/role-institute/placement
 *
 * Add placement details for a student.
 *
 * If the student already has a placement record,
 * the service updates the existing record.
 */
router.post(
  "/",
  verifyToken,
  saveInstitutePlacement
);

/**
 * PUT /api/role-institute/placement
 *
 * Update placement details for a student.
 *
 * If no record exists, the service inserts it.
 */
router.put(
  "/",
  verifyToken,
  updateInstitutePlacement
);

export default router;