
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

// Render Persistent Disk mount path.
// Configure UPLOAD_DIR in Render environment variables.
// Example: UPLOAD_DIR=/var/data

const uploadBaseDir =
  process.env.UPLOAD_DIR || "/var/data";

const uploadDir = path.join(
  uploadBaseDir,
  "uploads",
  "coach-profiles"
);

// Create directory if it does not exist.
try {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Coach profile upload directory:", uploadDir);
} catch (error) {
  console.error(
    "Failed to create coach profile upload directory:",
    error
  );
  throw error;
}

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

    if (!extension) {
      return cb(new Error("Unsupported image format."));
    }

    cb(
      null,
      `${Date.now()}-${crypto.randomUUID()}${extension}`
    );
  },
});

// --------------------------------------------------
// FILE VALIDATION
// --------------------------------------------------

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only JPG, PNG, and WEBP images are allowed."
        )
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
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image size must not exceed 5 MB.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Only one profile image can be uploaded.",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed.",
    });
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
