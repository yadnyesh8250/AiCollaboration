import { Router } from "express";
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} from "./task.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware.js";

// Nested workspace task router: mounted under /api/workspaces/:workspaceId/tasks
const workspaceTaskRouter = Router({ mergeParams: true });
workspaceTaskRouter.use(protect);

workspaceTaskRouter.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createTask);
workspaceTaskRouter.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listTasks);

// Flat task router: mounted under /api/tasks
const flatTaskRouter = Router();
flatTaskRouter.use(protect);

flatTaskRouter.get("/:taskId", getTask);
flatTaskRouter.patch("/:taskId", updateTask);
flatTaskRouter.patch("/:taskId/status", updateTaskStatus);
flatTaskRouter.delete("/:taskId", deleteTask);

export { workspaceTaskRouter, flatTaskRouter };
