import { Router } from "express";
import {
  createConversation,
  sendPrompt,
  listConversations,
  addKnowledge,
  listKnowledge,
  updatePermissions,
  updateAIConfig,
  updateAIPersona,
  getAnalytics,
  queueJobRequest
} from "../controllers/ai.controller.js";
import {
  generateTasks,
  generateDocument
} from "../controllers/aiProductivity.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(aiLimiter);

// Nested routes under /api/workspaces/:workspaceId/ai
// Conversations & Config require MEMBER/ADMIN/OWNER access
router.post("/conversations", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createConversation);
router.get("/conversations", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listConversations);

// AI Productivity Automation (Member or above can generate tasks/documents)
router.post("/task-generate", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), generateTasks);
router.post("/doc-generate", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), generateDocument);

// Config, Persona, Permissions, Jobs, Analytics require ADMIN/OWNER access
router.patch("/config", requireWorkspaceRole(["OWNER", "ADMIN"]), updateAIConfig);
router.patch("/persona", requireWorkspaceRole(["OWNER", "ADMIN"]), updateAIPersona);
router.patch("/permissions", requireWorkspaceRole(["OWNER", "ADMIN"]), updatePermissions);
router.get("/analytics", requireWorkspaceRole(["OWNER", "ADMIN"]), getAnalytics);
router.post("/jobs", requireWorkspaceRole(["OWNER", "ADMIN"]), queueJobRequest);

// Knowledge Base (RAG additions)
router.post("/knowledge", requireWorkspaceRole(["OWNER", "ADMIN"]), addKnowledge);
router.get("/knowledge", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listKnowledge);

// Note: /api/ai/conversations/:conversationId/messages is mounted flat in server.js
// since the conversationId itself can uniquely resolve the workspace context.

export default router;
