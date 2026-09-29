// src/controllers/role-coach/availability.controller.js

import {
  getCoachAvailabilityService,
  createCoachAvailabilityService,
  updateCoachAvailabilityService,
  toggleCoachAvailabilityService,
  deleteCoachAvailabilityService,
  getCoachOverridesService,
  createCoachOverrideService,
  updateCoachOverrideService,
  deleteCoachOverrideService,
} from "../../services/role-coach/availability.service.js";

/* -------------------------------------------------------------------------- */
/* WEEKLY AVAILABILITY                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Get coach weekly availability
 */
export const getCoachAvailability = async (req, res) => {
  try {
    const coachId = req.user.id;

    const availability =
      await getCoachAvailabilityService({
        coachId,
      });

    return res.status(200).json({
      success: true,
      message: "Availability fetched successfully",
      data: availability,
    });
  } catch (error) {
    console.error(
      "getCoachAvailability controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch availability",
    });
  }
};

/**
 * Create weekly availability slot
 */
export const createCoachAvailability = async (req, res) => {
  try {
    const coachId = req.user.id;

    const {
      dayOfWeek,
      startTime,
      endTime,
      timezone,
    } = req.body;

    const availability =
      await createCoachAvailabilityService({
        coachId,
        dayOfWeek,
        startTime,
        endTime,
        timezone,
      });

    return res.status(201).json({
      success: true,
      message: "Availability created successfully",
      data: availability,
    });
  } catch (error) {
    console.error(
      "createCoachAvailability controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to create availability",
    });
  }
};

/**
 * Update weekly availability slot
 */
export const updateCoachAvailability = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { availabilityId } = req.params;

    const {
      dayOfWeek,
      startTime,
      endTime,
      timezone,
    } = req.body;

    const availability =
      await updateCoachAvailabilityService({
        availabilityId,
        coachId,
        dayOfWeek,
        startTime,
        endTime,
        timezone,
      });

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  } catch (error) {
    console.error(
      "updateCoachAvailability controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to update availability",
    });
  }
};

/**
 * Toggle weekly availability
 */
export const toggleCoachAvailability = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { availabilityId } = req.params;
    const { isActive } = req.body;

    const availability =
      await toggleCoachAvailabilityService({
        availabilityId,
        coachId,
        isActive,
      });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Availability activated successfully"
        : "Availability deactivated successfully",
      data: availability,
    });
  } catch (error) {
    console.error(
      "toggleCoachAvailability controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to update availability status",
    });
  }
};

/**
 * Delete weekly availability
 */
export const deleteCoachAvailability = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { availabilityId } = req.params;

    const availability =
      await deleteCoachAvailabilityService({
        availabilityId,
        coachId,
      });

    return res.status(200).json({
      success: true,
      message: "Availability deleted successfully",
      data: availability,
    });
  } catch (error) {
    console.error(
      "deleteCoachAvailability controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete availability",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* DATE OVERRIDES                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Get coach availability overrides
 */
export const getCoachOverrides = async (req, res) => {
  try {
    const coachId = req.user.id;

    const {
      fromDate,
      toDate,
    } = req.query;

    const overrides =
      await getCoachOverridesService({
        coachId,
        fromDate,
        toDate,
      });

    return res.status(200).json({
      success: true,
      message: "Availability overrides fetched successfully",
      data: overrides,
    });
  } catch (error) {
    console.error(
      "getCoachOverrides controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch availability overrides",
    });
  }
};

/**
 * Create date-specific override
 */
export const createCoachOverride = async (req, res) => {
  try {
    const coachId = req.user.id;

    const {
      overrideDate,
      startTime,
      endTime,
      overrideType,
      timezone,
      note,
    } = req.body;

    const override =
      await createCoachOverrideService({
        coachId,
        overrideDate,
        startTime,
        endTime,
        overrideType,
        timezone,
        note,
      });

    return res.status(201).json({
      success: true,
      message: "Availability override created successfully",
      data: override,
    });
  } catch (error) {
    console.error(
      "createCoachOverride controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to create availability override",
    });
  }
};

/**
 * Update date-specific override
 */
export const updateCoachOverride = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { overrideId } = req.params;

    const {
      overrideDate,
      startTime,
      endTime,
      overrideType,
      timezone,
      note,
    } = req.body;

    const override =
      await updateCoachOverrideService({
        overrideId,
        coachId,
        overrideDate,
        startTime,
        endTime,
        overrideType,
        timezone,
        note,
      });

    return res.status(200).json({
      success: true,
      message: "Availability override updated successfully",
      data: override,
    });
  } catch (error) {
    console.error(
      "updateCoachOverride controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to update availability override",
    });
  }
};

/**
 * Delete date-specific override
 */
export const deleteCoachOverride = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { overrideId } = req.params;

    const override =
      await deleteCoachOverrideService({
        overrideId,
        coachId,
      });

    return res.status(200).json({
      success: true,
      message: "Availability override deleted successfully",
      data: override,
    });
  } catch (error) {
    console.error(
      "deleteCoachOverride controller error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete availability override",
    });
  }
};