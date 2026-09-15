import {
  getInstitutePlacementsService,
  getInstituteStudentPlacementService,
  saveInstitutePlacementService,
} from "../../services/role-institute/placement.service.js";

/**
 * GET ALL PLACEMENT RECORDS
 *
 * Institute Role
 *
 * GET /api/role-institute/placement
 *
 * Returns all placement records belonging
 * to the logged-in institute.
 *
 * This API is used by the Placement Dashboard
 * to display submitted students in StudentTable.
 */
export const getInstitutePlacements = async (
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
     * Fetch all placement records
     * for this institute.
     */
    const data =
      await getInstitutePlacementsService(
        instituteId
      );

    return res.status(200).json({
      success: true,
      message:
        "Institute placement records fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Get institute placements error:",
      error
    );

    const message =
      error?.message ||
      "Failed to fetch institute placement records.";

    /**
     * Institute validation
     */
    if (
      message.includes("Institute ID is required")
    ) {
      return res.status(401).json({
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
 * GET PLACEMENT DETAILS FOR A STUDENT
 *
 * Institute Role
 *
 * GET /api/role-institute/placement/student/:studentId
 *
 * The institute can view placement details
 * only for students belonging to that institute.
 */
export const getInstituteStudentPlacement = async (
  req,
  res
) => {
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

    /**
     * Fetch placement details
     * for this specific student.
     */
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
     * Student does not belong to institute
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      ) ||
      message.includes(
        "Student user record not found"
      ) ||
      message.includes(
        "Student email not found"
      )
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

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

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

/**
 * CREATE / SAVE PLACEMENT DETAILS
 *
 * Institute Role
 *
 * POST /api/role-institute/placement
 *
 * If a placement record already exists,
 * the service updates it.
 */
export const saveInstitutePlacement = async (
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

    /**
     * Save placement details
     *
     * Service handles:
     *
     * Existing record → UPDATE
     * No record → INSERT
     */
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
      message.includes("Invalid") ||
      message.includes("must be")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /**
     * Student / institute validation
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      ) ||
      message.includes(
        "Student user record not found"
      ) ||
      message.includes(
        "Student email not found"
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

    /**
     * Save service handles the update.
     */
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
      message.includes("Invalid") ||
      message.includes("must be")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /**
     * Student / institute validation
     */
    if (
      message.includes(
        "Student does not belong to this institute"
      ) ||
      message.includes(
        "Student user record not found"
      ) ||
      message.includes(
        "Student email not found"
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