import multer from "multer";
import path from "path";
import fs from "fs";

// --------------------------------------------------
// Create upload directory
// --------------------------------------------------
const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "institute-profiles"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// --------------------------------------------------
// Store files on backend
// --------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    try {
      if (!req.user?.id) {
        return cb(
          new Error("Unauthorized user."),
          false
        );
      }

      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const fileName =
        `${req.user.id}-${Date.now()}${extension}`;

      cb(null, fileName);
    } catch (error) {
      cb(error, false);
    }
  },
});

// --------------------------------------------------
// Allowed extensions
// --------------------------------------------------
const allowedExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

// --------------------------------------------------
// Allowed MIME types
// --------------------------------------------------
const allowedMimeTypes = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
];

// --------------------------------------------------
// File filter
// --------------------------------------------------
const fileFilter = (req, file, cb) => {
  try {
    if (!file) {
      return cb(
        new Error("File is required."),
        false
      );
    }

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          "Only PNG, JPG, JPEG and WEBP images are allowed."
        ),
        false
      );
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error("Invalid image type."),
        false
      );
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// --------------------------------------------------
// Multer
// --------------------------------------------------
const uploadInstituteLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default uploadInstituteLogo;