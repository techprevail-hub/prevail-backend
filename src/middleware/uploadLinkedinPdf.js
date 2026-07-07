
import multer from "multer";

/**
 * ==========================================================
 * Multer Configuration
 * Store uploaded PDF in memory
 * ==========================================================
 */

const storage = multer.memoryStorage();

/**
 * Allow only PDF files
 */
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed."), false);
  }
};

const uploadLinkedinPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export default uploadLinkedinPdf;