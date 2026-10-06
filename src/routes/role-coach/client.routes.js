// src/routes/role-coach/client.routes.js

import express from "express";
import verifyToken from "../../middleware/verifyToken.js";

import {
  getCoachClients,
  getCoachClientById,
} from "../../controllers/role-coach/client.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getCoachClients);
router.get("/:clientId", getCoachClientById);

export default router;