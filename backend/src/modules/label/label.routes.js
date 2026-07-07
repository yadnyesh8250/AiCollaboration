import { Router } from "express";
import {
  createLabel,
  listLabels,
  deleteLabel,
  assignLabelToTask,
  removeLabelFromTask
} from "./label.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware.js";

// Nested workspace label router
const workspaceLabelRouter = Router({ mergeParams: true });
workspaceLabelRouter.use(protect);

workspaceLabelRouter.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createLabel);
workspaceLabelRouter.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listLabels);

// General label router for task mappings & deletion
const generalLabelRouter = Router();
generalLabelRouter.use(protect);

generalLabelRouter.delete("/labels/:id", deleteLabel);
generalLabelRouter.post("/tasks/:taskId/labels", assignLabelToTask);
generalLabelRouter.delete("/tasks/:taskId/labels/:labelId", removeLabelFromTask);

export { workspaceLabelRouter, generalLabelRouter };
