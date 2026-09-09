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
 * Get placement details of a particular student
 */
router.get(
  "/student/:studentId",
  verifyToken,
  getInstituteStudentPlacement
);

/**
 * POST /api/role-institute/placement
 * Add placement details for a student
 */
router.post(
  "/",
  verifyToken,
  saveInstitutePlacement
);

/**
 * PUT /api/role-institute/placement
 * Update placement details for a student
 */
router.put(
  "/",
  verifyToken,
  updateInstitutePlacement
);

export default router;