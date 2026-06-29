import { Router } from "express";
import { register, login, getMe, logout, logoutAll, refresh } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);

export default router;
