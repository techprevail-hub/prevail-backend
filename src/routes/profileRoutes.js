import express from "express";

import {
  createProfile,
  getProfile,
  updateProfile,
} from "../controllers/profileController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createProfile);

router.get("/me", authMiddleware, getProfile);

router.put("/update", authMiddleware, updateProfile);

export default router;