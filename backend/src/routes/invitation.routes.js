import { Router } from "express";
import {
  createInvite,
  acceptInvite,
  listPendingInvites
} from "../controllers/invitation.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";

// Note: /api/workspaces/:workspaceId/invites is mounted in workspace.routes.js (Wait, I should mount it there instead to get the workspaceId param easily, or mount it here and use mergeParams).
// Let's just create a flat router for the /api/invites endpoint, and the generate one can be flat too, but wait:
// To use requireWorkspaceRole, we need :workspaceId in the route.

const router = Router();
router.use(protect);

// GET /api/invites/pending
router.get("/pending", listPendingInvites);

// POST /api/invites/accept
router.post("/accept", acceptInvite);

// We can also define POST /api/invites/:workspaceId
router.post("/:workspaceId", requireWorkspaceRole(["OWNER", "ADMIN"]), createInvite);

export default router;
