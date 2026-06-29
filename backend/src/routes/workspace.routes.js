import { Router } from "express";
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
} from "../controllers/workspace.controller.js";
import {
  addMember,
  listMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceMember.controller.js";
import { protect } from "../middleware/auth.middleware.js";

// mergeParams: true → gives access to :orgId from parent router
const router = Router({ mergeParams: true });

router.use(protect);

// Workspace CRUD (nested under /api/organizations/:orgId/workspaces)
router.post("/", createWorkspace);
router.get("/", listWorkspaces);

// Flat workspace routes (mounted under /api/workspaces)
router.get("/:workspaceId", getWorkspace);

// Member management
router.post("/:workspaceId/members", addMember);
router.get("/:workspaceId/members", listMembers);
router.patch("/:workspaceId/members/:memberId", updateMemberRole);
router.delete("/:workspaceId/members/:memberId", removeMember);

export default router;
