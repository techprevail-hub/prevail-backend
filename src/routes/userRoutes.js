import express from "express";
import {
  syncUser,
  updateUserRole,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

// OAuth flow
router.post("/sync", syncUser);
router.post("/role", updateUserRole);

// CRUD
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;