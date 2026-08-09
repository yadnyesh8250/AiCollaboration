import { Router } from "express";
import {
  processMeetingToWorkflow,
  extractTaskFromText,
  getWorkspaceHealth,
  generateSprintPlan,
  getProactiveAlerts,
  simulateGitHubPR,
  getWorkspaceMemories,
  addWorkspaceMemory,
  deleteWorkspaceMemory,
} from "../controllers/aiWorkflow.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";

const router = Router({ mergeParams: true });

router.use(protect);

// 1. AI Meeting → Tasks → Docs Pipeline
router.post("/meeting-pipeline", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), processMeetingToWorkflow);

// 2. Real-time Chat Task Extractor
router.post("/extract-task", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), extractTaskFromText);

// 3. Workspace Health Score
router.get("/health", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkspaceHealth);

// 4. AI Sprint Planner
router.post("/sprint-plan", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), generateSprintPlan);

// 5. Proactive Alerts
router.get("/alerts", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getProactiveAlerts);

// 6. GitHub PR Simulator
router.post("/github-pr", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), simulateGitHubPR);

// 7. Workspace Memory Vault
router.get("/memories", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkspaceMemories);
router.post("/memories", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), addWorkspaceMemory);
router.delete("/memories/:memoryId", requireWorkspaceRole(["OWNER", "ADMIN"]), deleteWorkspaceMemory);

export default router;
