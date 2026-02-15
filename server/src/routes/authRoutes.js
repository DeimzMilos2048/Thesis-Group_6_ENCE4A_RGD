import express from "express";
import {
  getMe,
  loginUser,
  registerUser,
  getAdminDashboard,
  getDashboard,
  updateUser,
  deleteUser,
  logoutUser
} from "../controllers/authController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/login", loginUser);
router.post("/register", registerUser);

// Protected routes
router.get("/me", protect, getMe);
router.get("/dashboard", protect, getDashboard);
router.post("/logout", logoutUser);

// Admin routes
router.get("/admin/dashboard", protect, admin, getAdminDashboard);
router.put("/users/:id", protect, admin, updateUser);
router.delete("/users/:id", protect, admin, deleteUser);

export default router;