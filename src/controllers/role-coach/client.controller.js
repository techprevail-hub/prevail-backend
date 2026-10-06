// src/controllers/role-coach/client.controller.js

import {
  getCoachClientsService,
  getCoachClientByIdService,
} from "../../services/role-coach/client.service.js";

/* -------------------------------------------------------------------------- */
/* GET /clients                                                               */
/* -------------------------------------------------------------------------- */

export const getCoachClients = async (req, res) => {
  try {
    const coachId = req.user?.id;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const clients = await getCoachClientsService({
      coachId,
    });

    return res.status(200).json({
      success: true,
      message: "Clients fetched successfully",
      data: clients,
    });
  } catch (error) {
    console.error("Get coach clients error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch clients",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* GET /clients/:clientId                                                     */
/* -------------------------------------------------------------------------- */

export const getCoachClientById = async (req, res) => {
  try {
    const coachId = req.user?.id;
    const { clientId } = req.params;

    if (!coachId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const client = await getCoachClientByIdService({
      coachId,
      clientId,
    });

    return res.status(200).json({
      success: true,
      message: "Client fetched successfully",
      data: client,
    });
  } catch (error) {
    console.error("Get coach client error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch client",
    });
  }
};