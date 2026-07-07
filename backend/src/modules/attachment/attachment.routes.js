import { Router } from "express";
import multer from "multer";
import { uploadTaskAttachment, deleteTaskAttachment } from "./attachment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.use(protect);

router.post("/tasks/:taskId/attachments", upload.single("file"), uploadTaskAttachment);
router.delete("/attachments/:id", deleteTaskAttachment);

export default router;
