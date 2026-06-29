import express from "express";
import { getStudents } from "../../controllers/role-institute/student.controller.js";

const router = express.Router();

// Get Students with Pagination, Search, Filter & Sorting
router.get("/", getStudents);

export default router;