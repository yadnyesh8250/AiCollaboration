import { Router } from "express";
import { register, login, getMe, logout, logoutAll, refresh } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema, refreshSchema } from "../validations/auth.validation.js";

const router = Router();

// Public routes
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", authLimiter, validate(refreshSchema), refresh);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);

export default router;
