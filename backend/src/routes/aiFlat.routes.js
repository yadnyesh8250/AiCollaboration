import { Router } from "express";
import { sendPrompt } from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.use(protect);
router.use(aiLimiter);

// POST /api/ai/conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", sendPrompt);

export default router;
