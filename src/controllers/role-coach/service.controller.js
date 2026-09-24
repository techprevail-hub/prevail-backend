// src/controllers/role-coach/service.controller.js

import {
  getCoachServicesService,
  getCoachServiceByIdService,
  createCoachServiceService,
  updateCoachServiceService,
  toggleCoachServiceService,
  deleteCoachServiceService,
} from "../../services/role-coach/service.service.js";

import {
  validateCreateService,
  validateUpdateService,
} from "../../validations/role-coach/service.validation.js";

/**
 * Get all coach services
 */
export const getCoachServices = async (req, res) => {
  try {
    const coachId = req.user.id;

    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
    } = req.query;

    const result = await getCoachServicesService({
      coachId,
      page,
      limit,
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Coach services fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getCoachServices controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch coach services",
    });
  }
};

/**
 * Get service by ID
 */
export const getCoachServiceById = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { serviceId } = req.params;

    const service = await getCoachServiceByIdService({
      serviceId,
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Coach service fetched successfully",
      data: service,
    });
  } catch (error) {
    console.error("getCoachServiceById controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch coach service",
    });
  }
};

/**
 * Create service
 */
export const createCoachService = async (req, res) => {
  try {
    const coachId = req.user.id;

    const errors = validateCreateService(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const service = await createCoachServiceService({
      coachId,
      name: req.body.name,
      description: req.body.description,
      sessionType: req.body.sessionType,
      durationMinutes: req.body.durationMinutes,
      price: req.body.price,
      currency: req.body.currency,
      isFree: req.body.isFree,
      isActive: req.body.isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    console.error("createCoachService controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create service",
    });
  }
};

/**
 * Update service
 */
export const updateCoachService = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { serviceId } = req.params;

    const errors = validateUpdateService(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const service = await updateCoachServiceService({
      serviceId,
      coachId,
      name: req.body.name,
      description: req.body.description,
      sessionType: req.body.sessionType,
      durationMinutes: req.body.durationMinutes,
      price: req.body.price,
      currency: req.body.currency,
      isFree: req.body.isFree,
      isActive: req.body.isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service,
    });
  } catch (error) {
    console.error("updateCoachService controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update service",
    });
  }
};

/**
 * Toggle service status
 */
export const toggleCoachService = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { serviceId } = req.params;

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    const service = await toggleCoachServiceService({
      serviceId,
      coachId,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: `Service ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: service,
    });
  } catch (error) {
    console.error("toggleCoachService controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update service status",
    });
  }
};

/**
 * Soft delete service
 */
export const deleteCoachService = async (req, res) => {
  try {
    const coachId = req.user.id;
    const { serviceId } = req.params;

    const service = await deleteCoachServiceService({
      serviceId,
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Service deactivated successfully",
      data: service,
    });
  } catch (error) {
    console.error("deleteCoachService controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to deactivate service",
    });
  }
};