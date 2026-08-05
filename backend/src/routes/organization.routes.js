import { Router } from "express";
import {
  createOrganization,
  listMyOrganizations,
  getOrganization,
  listAllGlobalOrganizations,
  joinOrganization,
} from "../controllers/organization.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireOrgRole } from "../middleware/rbac.middleware.js";
import workspaceRouter from "./workspace.routes.js";

const router = Router();

// All organization routes require auth
router.use(protect);

router.post("/", createOrganization);
router.get("/", listMyOrganizations);

// Global public org list (registered users can discover)
router.get("/global/all", listAllGlobalOrganizations);

// Join organization
router.post("/:orgId/join", joinOrganization);

// Require at least a MEMBER role to get org details
router.get("/:orgId", requireOrgRole(["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"]), getOrganization);

// Nest workspace routes under org
// e.g. POST /api/organizations/:orgId/workspaces
router.use("/:orgId/workspaces", requireOrgRole(["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"]), workspaceRouter);

export default router;
