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

const router = Router();

router.use(protect);

// Task comments
router.post("/tasks/:taskId/comments", createTaskComment);
router.get("/tasks/:taskId/comments", listTaskComments);
router.patch("/comments/:id", updateTaskComment);
router.delete("/comments/:id", deleteTaskComment);

// Document comments
router.post("/documents/:documentId/comments", createDocumentComment);
router.get("/documents/:documentId/comments", listDocumentComments);

export default router;
