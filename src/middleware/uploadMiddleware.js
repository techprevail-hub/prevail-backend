import multer from "multer";
import path from "path";

// Store uploaded files in memory
const storage = multer.memoryStorage();

// Allow PDF, DOCX, and image files
const fileFilter = (req, file, cb) => {
  try {
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".png",
      ".jpg",
      ".jpeg",
    ];

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PDF, DOCX, PNG, JPG, and JPEG files are allowed."
        ),
        false
      );
    }
  } catch (error) {
    cb(error, false);
  }
};

// Create upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

export default upload;