import { Router } from "express";
import {
  createSprint,
  listSprints,
  updateSprint,
  assignTaskToSprint,
  removeTaskFromSprint
} from "./sprint.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware.js";

// Nested workspace sprint router
const workspaceSprintRouter = Router({ mergeParams: true });
workspaceSprintRouter.use(protect);

workspaceSprintRouter.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createSprint);
workspaceSprintRouter.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listSprints);

// General sprint router for updates & task assignments
const generalSprintRouter = Router();
generalSprintRouter.use(protect);

generalSprintRouter.patch("/sprints/:id", updateSprint);
generalSprintRouter.post("/sprints/:sprintId/tasks", assignTaskToSprint);
generalSprintRouter.delete("/sprints/:sprintId/tasks/:taskId", removeTaskFromSprint);

export { workspaceSprintRouter, generalSprintRouter };
