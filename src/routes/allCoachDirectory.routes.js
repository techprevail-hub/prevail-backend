import express from "express";
import {
  getAllCoaches,
} from "../controllers/allCoachDirectory.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAllCoaches);

export default router;