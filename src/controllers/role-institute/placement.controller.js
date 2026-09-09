import {
  getInstituteStudentPlacementService,
  saveInstitutePlacementService,
} from "../../services/role-institute/placement.service.js";

/**
 * GET PLACEMENT DETAILS FOR A STUDENT
 *
 * Institute Role
 *
 * GET /api/role-institute/placement/student/:studentId
 *
 * The institute can view placement details
 * only for students belonging to that institute.
 */
export const getInstituteStudentPlacement = async (req, res) => {
  try {
    const instituteId =
      req.user?.instituteId ||
      req.user?.institute_id;

    const { studentId } = req.params;

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute ID not found.",
      });
    }

    /**
     * Check student ID
     */
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required.",
      });
    }

    const data =
      await getInstituteStudentPlacementService(
        instituteId,
        studentId
      );

    return res.status(200).json({
      success: true,
      message:
        "Student placement details fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Get institute student placement error:",
      error
    );

    const message =
      error?.message ||
      "Failed to fetch student placement details.";

    /**
     * Student does not belong to this institute
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      )
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    /**
     * Required / validation errors
     */
    if (
      message.includes("required") ||
      message.includes("Invalid")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * CREATE PLACEMENT DETAILS
 *
 * Institute Role
 *
 * POST /api/role-institute/placement
 *
 * The institute can add placement details
 * for any student belonging to the institute.
 *
 * If a placement record already exists,
 * the service will update it instead.
 */
export const saveInstitutePlacement = async (req, res) => {
  try {
    const instituteId =
      req.user?.instituteId ||
      req.user?.institute_id;

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute ID not found.",
      });
    }

    /**
     * Request body
     */
    const placementData = req.body;

    if (
      !placementData ||
      Object.keys(placementData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Placement data is required.",
      });
    }

    const result =
      await saveInstitutePlacementService(
        instituteId,
        placementData
      );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error(
      "❌ Save institute placement error:",
      error
    );

    const message =
      error?.message ||
      "Failed to save placement details.";

    /**
     * Validation errors
     */
    if (
      message.includes("required") ||
      message.includes("Invalid")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /**
     * Student / institute validation error
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      )
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * UPDATE PLACEMENT DETAILS
 *
 * Institute Role
 *
 * PUT /api/role-institute/placement
 *
 * The service handles both:
 *
 * Existing record
 *      ↓
 * UPDATE
 *
 * No existing record
 *      ↓
 * INSERT
 */
export const updateInstitutePlacement = async (
  req,
  res
) => {
  try {
    const instituteId =
      req.user?.instituteId ||
      req.user?.institute_id;

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute ID not found.",
      });
    }

    /**
     * Request body
     */
    const placementData = req.body;

    if (
      !placementData ||
      Object.keys(placementData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Placement data is required.",
      });
    }

    const result =
      await saveInstitutePlacementService(
        instituteId,
        placementData
      );

    return res.status(200).json({
      success: true,
      message:
        "Placement details updated successfully.",
      data: result.data,
    });
  } catch (error) {
    console.error(
      "❌ Update institute placement error:",
      error
    );

    const message =
      error?.message ||
      "Failed to update placement details.";

    /**
     * Validation errors
     */
    if (
      message.includes("required") ||
      message.includes("Invalid")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /**
     * Student / institute validation error
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      )
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};