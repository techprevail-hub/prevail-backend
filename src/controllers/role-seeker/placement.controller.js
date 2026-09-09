import {
  getStudentPlacementService,
  saveStudentPlacementService,
} from "../../services/role-seeker/placement.service.js";

/**
 * GET STUDENT PLACEMENT DETAILS
 *
 * GET /api/role-seeker/placement
 *
 * Gets placement details of the logged-in student.
 */
export const getStudentPlacement = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    const data = await getStudentPlacementService(userId);

    return res.status(200).json({
      success: true,
      message: "Placement details fetched successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Get student placement controller error:",
      error
    );

    const message =
      error?.message ||
      "Failed to fetch placement details.";

    /*
     * Student context errors
     */
    if (
      message.includes("User ID is required") ||
      message.includes("Student record not found")
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
 * CREATE / UPDATE STUDENT PLACEMENT DETAILS
 *
 * POST /api/role-seeker/placement
 *
 * The service automatically:
 * - Inserts a new record if one does not exist.
 * - Updates the existing record if one already exists.
 */
export const saveStudentPlacement = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

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

    const data = await saveStudentPlacementService(
      userId,
      placementData
    );

    return res.status(200).json({
      success: true,
      message: data.message,
      data: data.data,
    });
  } catch (error) {
    console.error(
      "❌ Save student placement controller error:",
      error
    );

    const message =
      error?.message ||
      "Failed to save placement details.";

    /*
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

    /*
     * Student context errors
     */
    if (
      message.includes("User ID is required") ||
      message.includes("Student record not found")
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
 * UPDATE STUDENT PLACEMENT DETAILS
 *
 * PUT /api/role-seeker/placement
 *
 * The same service is used for both create and update.
 * If the record already exists, it is updated.
 */
export const updateStudentPlacement = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

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

    const data = await saveStudentPlacementService(
      userId,
      placementData
    );

    return res.status(200).json({
      success: true,
      message: "Placement details updated successfully.",
      data: data.data,
    });
  } catch (error) {
    console.error(
      "❌ Update student placement controller error:",
      error
    );

    const message =
      error?.message ||
      "Failed to update placement details.";

    /*
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

    /*
     * Student context errors
     */
    if (
      message.includes("User ID is required") ||
      message.includes("Student record not found")
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