import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachServices,
  getCoachServiceById,
  createCoachService,
  updateCoachService,
  toggleCoachService,
  deleteCoachService,
} from "../../controllers/role-coach/service.controller.js";

const router = express.Router();

/**
 * GET /api/role-coach/services
 *
 * Get all services created by the
 * logged-in coach.
 *
 * Supports:
 * - Pagination
 * - Search
 * - Active/Inactive status filter
 */
router.get(
  "/",
  verifyToken,
  getCoachServices
);

/**
 * GET /api/role-coach/services/:serviceId
 *
 * Get details of a specific service.
 *
 * Coach can only access their own service.
 */
router.get(
  "/:serviceId",
  verifyToken,
  getCoachServiceById
);

/**
 * POST /api/role-coach/services
 *
 * Create a new service for the
 * logged-in coach.
 */
router.post(
  "/",
  verifyToken,
  createCoachService
);

/**
 * PUT /api/role-coach/services/:serviceId
 *
 * Update an existing service.
 *
 * Coach can only update their own service.
 */
router.put(
  "/:serviceId",
  verifyToken,
  updateCoachService
);

/**
 * PATCH /api/role-coach/services/:serviceId/status
 *
 * Activate or deactivate a service.
 *
 * Body:
 * {
 *   "isActive": true
 * }
 */
router.patch(
  "/:serviceId/status",
  verifyToken,
  toggleCoachService
);

/**
 * DELETE /api/role-coach/services/:serviceId
 *
 * Soft delete / deactivate a service.
 *
 * The service is not permanently removed
 * so that existing booking/session history
 * remains safe.
 */
router.delete(
  "/:serviceId",
  verifyToken,
  deleteCoachService
);

export default router;