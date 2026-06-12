import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// GET USER NOTIFICATIONS
router.get(
  "/",
  authMiddleware,
  getNotifications
);

// CREATE NOTIFICATION
router.post(
  "/create",
  authMiddleware,
  createNotification
);

// MARK SINGLE READ
router.put(
  "/read/:id",
  authMiddleware,
  markAsRead
);

// MARK ALL READ
router.put(
  "/read-all",
  authMiddleware,
  markAllAsRead
);

export default router;