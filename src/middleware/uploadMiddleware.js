import multer from "multer";
import path from "path";

// --------------------------------------------------
// Store uploaded files in memory
// --------------------------------------------------
const storage = multer.memoryStorage();

// --------------------------------------------------
// Allowed file extensions
// --------------------------------------------------
const allowedExtensions = [
  ".pdf",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

// --------------------------------------------------
// Allowed MIME types
// --------------------------------------------------
const allowedMimeTypes = [
  "application/pdf",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
];

// --------------------------------------------------
// File filter validation
// --------------------------------------------------
const fileFilter = (req, file, cb) => {
  try {
    // ----------------------------------------------
    // Validate file existence
    // ----------------------------------------------
    if (!file) {
      return cb(
        new Error("File is required."),
        false
      );
    }

    // ----------------------------------------------
    // Validate extension
    // ----------------------------------------------
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return cb(
        new Error(
          "Only PDF, DOCX, PNG, JPG, JPEG, and WEBP files are allowed."
        ),
        false
      );
    }

    // ----------------------------------------------
    // Validate MIME type
    // ----------------------------------------------
    if (
      !allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      return cb(
        new Error(
          "Invalid or corrupted file type."
        ),
        false
      );
    }

    // ----------------------------------------------
    // Validate filename
    // ----------------------------------------------
    if (
      !file.originalname ||
      file.originalname.trim().length === 0
    ) {
      return cb(
        new Error(
          "Invalid file name."
        ),
        false
      );
    }

    // ----------------------------------------------
    // File accepted
    // ----------------------------------------------
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// --------------------------------------------------
// Create multer upload middleware
// --------------------------------------------------
const upload = multer({
  storage,

  fileFilter,

  limits: {
    // 10 MB max size
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;