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
import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";

// mergeParams: true → gives access to :orgId from parent router
const router = Router({ mergeParams: true });

router.use(protect);

// Workspace CRUD (nested under /api/organizations/:orgId/workspaces)
// These routes do NOT have :workspaceId, so we can't use requireWorkspaceRole here.
// They use requireOrgRole from organization.routes.js.
router.post("/", createWorkspace);
router.get("/", listWorkspaces);

// Channel routes (nested under /api/workspaces/:workspaceId/channels)
router.use("/:workspaceId/channels", channelRoutes);

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
