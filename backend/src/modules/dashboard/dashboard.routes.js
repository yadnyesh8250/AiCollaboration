import { Router } from "express";
import { getWorkspaceDashboard, getWorkspaceCalendar } from "./dashboard.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware.js";

const router = Router({ mergeParams: true });

router.use(protect);

router.get("/dashboard", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkspaceDashboard);
router.get("/calendar", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), getWorkspaceCalendar);

export default router;
