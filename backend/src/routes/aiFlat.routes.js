import { Router } from "express";
import { sendPrompt } from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

// POST /api/ai/conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", sendPrompt);

export default router;
