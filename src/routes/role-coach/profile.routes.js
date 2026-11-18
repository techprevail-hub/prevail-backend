
import express from "express";
import multer from "multer";

import {
  createCoachProfile,
  getCoachProfile,
  updateCoachProfile,
  uploadCoachProfileImage,
} from "../../controllers/role-coach/profile.controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// MULTER CONFIGURATION
// --------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
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

// Handle Multer errors with a clear response.
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
// --------------------------------------------------
router.put(
  "/update",
  authMiddleware,
  updateCoachProfile
);

// --------------------------------------------------
// UPLOAD COACH PROFILE IMAGE
// --------------------------------------------------
router.post(
  "/upload-image",
  authMiddleware,
  handleImageUpload,
  uploadCoachProfileImage
);

export default router;
