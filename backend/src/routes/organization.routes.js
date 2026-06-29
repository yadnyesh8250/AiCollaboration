import { Router } from "express";
import {
  createOrganization,
  listMyOrganizations,
  getOrganization,
} from "../controllers/organization.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import workspaceRouter from "./workspace.routes.js";

const router = Router();

// All organization routes require auth
router.use(protect);

router.post("/", createOrganization);
router.get("/", listMyOrganizations);
router.get("/:orgId", getOrganization);

// Nest workspace routes under org
// e.g. POST /api/organizations/:orgId/workspaces
router.use("/:orgId/workspaces", workspaceRouter);

export default router;
