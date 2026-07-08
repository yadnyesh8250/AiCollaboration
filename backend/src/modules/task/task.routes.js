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
import { validate } from "../../middleware/validation.middleware.js";
import { createTaskSchema, updateTaskSchema } from "../../validations/task.validation.js";

// Nested workspace task router: mounted under /api/workspaces/:workspaceId/tasks
const workspaceTaskRouter = Router({ mergeParams: true });
workspaceTaskRouter.use(protect);

workspaceTaskRouter.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), validate(createTaskSchema), createTask);
workspaceTaskRouter.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listTasks);

// Flat task router: mounted under /api/tasks
const flatTaskRouter = Router();
flatTaskRouter.use(protect);

flatTaskRouter.get("/:taskId", getTask);
flatTaskRouter.patch("/:taskId", validate(updateTaskSchema), updateTask);
flatTaskRouter.patch("/:taskId/status", updateTaskStatus);
flatTaskRouter.delete("/:taskId", deleteTask);

export { workspaceTaskRouter, flatTaskRouter };
