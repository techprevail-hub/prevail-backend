import {
  getInstitutePlacementsService,
  getInstituteStudentPlacementService,
  saveInstitutePlacementService,
} from "../../services/role-institute/placement.service.js";

/**
 * ============================================================
 * GET ALL PLACEMENT RECORDS + DASHBOARD STATS
 * ============================================================
 *
 * Institute Role
 *
 * GET /api/role-institute/placement
 *
 * Returns overall placement dashboard data for the
 * logged-in institute.
 *
 * Response:
 *
 * {
 *   success: true,
 *   message: "Institute placement data fetched successfully.",
 *   data: {
 *     stats: {
 *       totalStudents,
 *       submitted,
 *       placed,
 *       notPlaced,
 *       notSubmitted
 *     },
 *     placements: []
 *   }
 * }
 *
 * The frontend uses this single API for:
 *
 * 1. Placement statistics/cards
 * 2. Overall placement StudentTable
 *
 * No students table is used.
 */
export const getInstitutePlacements = async (req, res) => {
  try {
    console.log(
      "📋 [getInstitutePlacements] REQ.USER =>",
      req.user
    );

    // ---------------------------------------------------------
    // Get institute ID from authenticated user
    // ---------------------------------------------------------
    // IMPORTANT:
    // verifyToken sets the authenticated user's UUID as req.user.id.
    // This is the same pattern used by the existing institute
    // controllers such as inviteStudent.controller.js.
    const instituteId = req.user?.id;

    console.log(
      "📋 [getInstitutePlacements] Institute ID:",
      instituteId
    );

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute authentication is required.",
      });
    }

    /**
     * Fetch overall placement dashboard data.
     *
     * Service returns:
     *
     * {
     *   stats: {...},
     *   placements: [...]
     * }
     */
    const data = await getInstitutePlacementsService(
      instituteId
    );

    return res.status(200).json({
      success: true,
      message: "Institute placement data fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Get institute placements error:",
      error
    );

    const message =
      error?.message ||
      "Failed to fetch institute placement data.";

    /**
     * Institute validation error
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
 * ============================================================
 * GET PLACEMENT DETAILS FOR ONE STUDENT
 * ============================================================
 *
 * Institute Role
 *
 * GET /api/role-institute/placement/student/:studentId
 *
 * This API is used when the institute wants to:
 *
 * - View one student's placement details
 * - Open placement details in a dialog/modal
 * - Edit placement details
 *
 * IMPORTANT:
 *
 * This does NOT mean creating another Placement page.
 *
 * The institute still has only:
 *
 * /dashboard/institute/placement
 *
 * The frontend can call this API from a dialog
 * opened on that overall Placement page.
 */
export const getInstituteStudentPlacement = async (
  req,
  res
) => {
  try {
    console.log(
      "📋 [getInstituteStudentPlacement] REQ.USER =>",
      req.user
    );

    // ---------------------------------------------------------
    // Get institute ID from authenticated user
    // ---------------------------------------------------------
    const instituteId = req.user?.id;

    // ---------------------------------------------------------
    // Get student ID from URL params
    // ---------------------------------------------------------
    const { studentId } = req.params;

    console.log(
      "📋 [getInstituteStudentPlacement] Institute ID:",
      instituteId
    );

    console.log(
      "📋 [getInstituteStudentPlacement] Student ID:",
      studentId
    );

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute authentication is required.",
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
     * Fetch placement details for the student.
     *
     * The service verifies that the student belongs
     * to the logged-in institute.
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
     * Student does not belong to this institute
     * or student record cannot be found.
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
 * ============================================================
 * CREATE / SAVE PLACEMENT DETAILS
 * ============================================================
 *
 * Institute Role
 *
 * POST /api/role-institute/placement
 *
 * If a placement record already exists for:
 *
 * institute_id + student_id
 *
 * the service updates that record.
 *
 * If no record exists, the service creates one.
 *
 * Therefore duplicate placement records are avoided.
 */
export const saveInstitutePlacement = async (
  req,
  res
) => {
  try {
    console.log(
      "📋 [saveInstitutePlacement] REQ.USER =>",
      req.user
    );

    // ---------------------------------------------------------
    // Get institute ID from authenticated user
    // ---------------------------------------------------------
    const instituteId = req.user?.id;

    console.log(
      "📋 [saveInstitutePlacement] Institute ID:",
      instituteId
    );

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute authentication is required.",
      });
    }

    // ---------------------------------------------------------
    // Get request body
    // ---------------------------------------------------------
    const placementData = req.body;

    console.log(
      "📋 [saveInstitutePlacement] Placement Data:",
      placementData
    );

    /**
     * Validate request body
     */
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
     * Save placement details.
     *
     * Service handles:
     *
     * Existing record
     *      ↓
     * UPDATE
     *
     * No record
     *      ↓
     * INSERT
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
     * Student / institute validation errors
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
 * ============================================================
 * UPDATE PLACEMENT DETAILS
 * ============================================================
 *
 * Institute Role
 *
 * PUT /api/role-institute/placement
 *
 * The same save service is used here because it already
 * determines whether a placement record exists.
 *
 * Existing record
 *      ↓
 * UPDATE
 *
 * No existing record
 *      ↓
 * INSERT
 *
 * This keeps the placement flow consistent and prevents
 * duplicate records.
 */
export const updateInstitutePlacement = async (
  req,
  res
) => {
  try {
    console.log(
      "📋 [updateInstitutePlacement] REQ.USER =>",
      req.user
    );

    // ---------------------------------------------------------
    // Get institute ID from authenticated user
    // ---------------------------------------------------------
    const instituteId = req.user?.id;

    console.log(
      "📋 [updateInstitutePlacement] Institute ID:",
      instituteId
    );

    /**
     * Check institute authentication
     */
    if (!instituteId) {
      return res.status(401).json({
        success: false,
        message: "Institute authentication is required.",
      });
    }

    // ---------------------------------------------------------
    // Get request body
    // ---------------------------------------------------------
    const placementData = req.body;

    console.log(
      "📋 [updateInstitutePlacement] Placement Data:",
      placementData
    );

    /**
     * Validate request body
     */
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
     * Save service handles the actual update.
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
     * Student / institute validation errors
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