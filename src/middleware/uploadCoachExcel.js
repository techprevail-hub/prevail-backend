// middleware/uploadCoachExcel.js

import multer from "multer";

// Configure multer for Excel file uploads
const storage = multer.memoryStorage();

// File filter to accept only Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  const allowedExtensions = [".xlsx", ".xls"];

  const fileExtension = file.originalname
    .toLowerCase()
    .slice(file.originalname.lastIndexOf("."));

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx or .xls) are allowed."), false);
  }
};

export const uploadCoachExcel = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: fileFilter,
});