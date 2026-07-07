import { Router } from "express";
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace
} from "../controllers/workspace.controller.js";
import {
  addMember,
  listMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceMember.controller.js";
import channelRoutes from "./channel.routes.js";
import aiRoutes from "./ai.routes.js";

// Phase 5 imports
import { workspaceTaskRouter } from "../modules/task/task.routes.js";
import { workspaceSprintRouter } from "../modules/sprint/sprint.routes.js";
import { workspaceLabelRouter } from "../modules/label/label.routes.js";
import { workspaceDocumentRouter } from "../modules/document/document.routes.js";
import workspaceDashboardRouter from "../modules/dashboard/dashboard.routes.js";

import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";

// mergeParams: true → gives access to :orgId from parent router
const router = Router({ mergeParams: true });

router.use(protect);

// Workspace CRUD (nested under /api/organizations/:orgId/workspaces)
router.post("/", createWorkspace);
router.get("/", listWorkspaces);

// Channel routes (nested under /api/workspaces/:workspaceId/channels)
router.use("/:workspaceId/channels", channelRoutes);

// AI routes (nested under /api/workspaces/:workspaceId/ai)
router.use("/:workspaceId/ai", aiRoutes);

// Phase 5 Workspace Scoped Nested Routes
router.use("/:workspaceId/tasks", workspaceTaskRouter);
router.use("/:workspaceId/sprints", workspaceSprintRouter);
router.use("/:workspaceId/labels", workspaceLabelRouter);
router.use("/:workspaceId/documents", workspaceDocumentRouter);
router.use("/:workspaceId", workspaceDashboardRouter);

// Flat workspace routes (mounted under /api/workspaces)
router.get("/:workspaceId", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkspace);
router.put("/:workspaceId", requireWorkspaceRole(["OWNER", "ADMIN"]), updateWorkspace);
router.delete("/:workspaceId", requireWorkspaceRole(["OWNER"]), deleteWorkspace);

// Member management
router.post("/:workspaceId/members", requireWorkspaceRole(["OWNER", "ADMIN"]), addMember);
router.get("/:workspaceId/members", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listMembers);
router.patch("/:workspaceId/members/:memberId", requireWorkspaceRole(["OWNER", "ADMIN"]), updateMemberRole);
router.delete("/:workspaceId/members/:memberId", requireWorkspaceRole(["OWNER", "ADMIN"]), removeMember);

export default router;
