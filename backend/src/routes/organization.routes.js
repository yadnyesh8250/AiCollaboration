import { Router } from "express";
import {
  createOrganization,
  listMyOrganizations,
  getOrganization,
} from "../controllers/organization.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireOrgRole } from "../middleware/rbac.middleware.js";
import workspaceRouter from "./workspace.routes.js";

const router = Router();

// All organization routes require auth
router.use(protect);

router.post("/", createOrganization);
router.get("/", listMyOrganizations);

// Require at least a MEMBER role to get org details
router.get("/:orgId", requireOrgRole(["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"]), getOrganization);

// Nest workspace routes under org
// e.g. POST /api/organizations/:orgId/workspaces
router.use("/:orgId/workspaces", requireOrgRole(["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"]), workspaceRouter);

export default router;
