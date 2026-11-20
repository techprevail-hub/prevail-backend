
import express from "express";
import multer from "multer";

import {
  createCoachProfile,
  getCoachProfile,
  updateCoachProfile,
} from "../../controllers/role-coach/profile.controller.js";

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// MULTER MEMORY STORAGE
// Images are temporarily held in memory.
// They will be uploaded directly to Supabase Storage.
// --------------------------------------------------

const storage = multer.memoryStorage();

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
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed.",
    });
  });
};

// --------------------------------------------------
// COACH PROFILE ROUTES
// --------------------------------------------------

router.post("/create", authMiddleware, createCoachProfile);

router.get("/me", authMiddleware, getCoachProfile);

router.put(
  "/update",
  authMiddleware,
  handleImageUpload,
  updateCoachProfile
);

export default router;
