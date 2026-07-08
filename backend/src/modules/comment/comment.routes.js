import { Router } from "express";
import {
  createTaskComment,
  listTaskComments,
  updateTaskComment,
  deleteTaskComment,
  createDocumentComment,
  listDocumentComments
} from "./comment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { taskCommentSchema } from "../../validations/task.validation.js";

const router = Router();

router.use(protect);

// Task comments
router.post("/tasks/:taskId/comments", validate(taskCommentSchema), createTaskComment);
router.get("/tasks/:taskId/comments", listTaskComments);
router.patch("/comments/:id", validate(taskCommentSchema), updateTaskComment);
router.delete("/comments/:id", deleteTaskComment);

// Document comments
router.post("/documents/:documentId/comments", validate(taskCommentSchema), createDocumentComment);
router.get("/documents/:documentId/comments", listDocumentComments);

export default router;
