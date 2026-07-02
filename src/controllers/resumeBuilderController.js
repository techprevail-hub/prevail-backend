import {
  createResumeService,
  getResumeService,
  getResumeByIdService,
  updateResumeService,
  deleteResumeService,
} from "../services/resumeBuilderService.js";

/**
 * ==========================================================
 * Get Authenticated User
 * ==========================================================
 */
const getUserId = (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized user.",
    });
    return null;
  }

  return userId;
};

/**
 * ==========================================================
 * Create Resume
 * POST /api/resume-builder/create
 * ==========================================================
 */
export const createResume = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const result = await createResumeService(
      userId,
      req.body
    );

    return res.status(result.status).json(result);

  } catch (error) {
    console.error("Create Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error.",
    });
  }
};

/**
 * ==========================================================
 * Get All Resumes
 * GET /api/resume-builder
 * ==========================================================
 */
export const getResume = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const result = await getResumeService(userId);

    return res.status(result.status).json(result);

  } catch (error) {
    console.error("Get Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error.",
    });
  }
};

/**
 * ==========================================================
 * Get Resume By ID
 * GET /api/resume-builder/:id
 * ==========================================================
 */
export const getResumeById = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const result = await getResumeByIdService(
      req.params.id,
      userId
    );

    return res.status(result.status).json(result);

  } catch (error) {
    console.error("Get Resume By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error.",
    });
  }
};

/**
 * ==========================================================
 * Update Resume
 * PUT /api/resume-builder/:id
 * ==========================================================
 */
export const updateResume = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const result = await updateResumeService(
      req.params.id,
      userId,
      req.body
    );

    return res.status(result.status).json(result);

  } catch (error) {
    console.error("Update Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error.",
    });
  }
};

/**
 * ==========================================================
 * Delete Resume
 * DELETE /api/resume-builder/:id
 * ==========================================================
 */
export const deleteResume = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const result = await deleteResumeService(
      req.params.id,
      userId
    );

    return res.status(result.status).json(result);

  } catch (error) {
    console.error("Delete Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error.",
    });
  }
};