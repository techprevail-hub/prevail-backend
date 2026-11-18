import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  createCoachProfile,
  getCoachProfile,
  updateCoachProfile,
} from "../../controllers/role-coach/profile.controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// COACH PROFILE IMAGE UPLOAD DIRECTORY
// --------------------------------------------------
const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "coach-profiles"
);

fs.mkdirSync(uploadDir, { recursive: true });

// --------------------------------------------------
// MULTER CONFIGURATION
// --------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extensionMap = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extension = extensionMap[file.mimetype];

    cb(
      null,
      `${Date.now()}-${crypto.randomUUID()}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});

// --------------------------------------------------
// HANDLE MULTER ERRORS
// --------------------------------------------------
const handleImageUpload = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image size must not exceed 5 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next();
  });
};

// --------------------------------------------------
// CREATE COACH PROFILE
// --------------------------------------------------
router.post(
  "/create",
  authMiddleware,
  createCoachProfile
);

// --------------------------------------------------
// GET LOGGED-IN COACH PROFILE
// --------------------------------------------------
router.get(
  "/me",
  authMiddleware,
  getCoachProfile
);

// --------------------------------------------------
// UPDATE COACH PROFILE
// Supports normal fields + optional profile image
// --------------------------------------------------
router.put(
  "/update",
  authMiddleware,
  handleImageUpload,
  updateCoachProfile
);

export default router;