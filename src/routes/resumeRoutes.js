import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { uploadResume } from "../controllers/resumeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Resume routes are working successfully.",
  });
});

router.post(
  "/upload",
  authMiddleware,
  upload.single("resume"),
  uploadResume
);

export default router;