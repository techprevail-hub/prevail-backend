import express from "express";
import verifyToken from "../middleware/verifyToken.js";

import {
  createResume,
  getResume,
  getResumeById,
  updateResume,
  deleteResume,
} from "../controllers/resumeBuilderController.js";

const router = express.Router();

/**
 * @route POST /api/resume-builder/create
 * @desc Create Resume
 * @access Private
 */
router.post(
  "/create",
  verifyToken,
  createResume
);

/**
 * @route GET /api/resume-builder
 * @desc Get Logged In User Resume List
 * @access Private
 */
router.get(
  "/",
  verifyToken,
  getResume
);

/**
 * @route GET /api/resume-builder/:id
 * @desc Get Single Resume
 * @access Private
 */
router.get(
  "/:id",
  verifyToken,
  getResumeById
);

/**
 * @route PUT /api/resume-builder/:id
 * @desc Update Resume
 * @access Private
 */
router.put(
  "/:id",
  verifyToken,
  updateResume
);

/**
 * @route DELETE /api/resume-builder/:id
 * @desc Delete Resume
 * @access Private
 */
router.delete(
  "/:id",
  verifyToken,
  deleteResume
);

export default router;