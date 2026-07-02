import { Router } from "express";
import {
  createMessage,
  listMessages,
  getThread,
  editMessage,
  deleteMessage
} from "../controllers/message.controller.js";
import { addReaction, removeReaction } from "../controllers/reaction.controller.js";
import { uploadAttachment, deleteAttachment } from "../controllers/attachment.controller.js";
import { markAsRead } from "../controllers/readReceipt.controller.js";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";

// Setup multer for local file uploads
const upload = multer({ dest: "uploads/" });

// Note: This router will be mounted at /api/messages for flat routes,
// and inside channel.routes.js for nested routes.

const router = Router({ mergeParams: true });
router.use(protect);

// Nested routes (mounted at /api/channels/:channelId/messages)
router.post("/", createMessage);
router.get("/", listMessages);

// Flat routes (mounted at /api/messages)
router.get("/:messageId/thread", getThread);
router.patch("/:id", editMessage);
router.delete("/:id", deleteMessage);

// Sub-entities
router.post("/:id/reactions", addReaction);
router.delete("/:id/reactions", removeReaction);
router.post("/:id/attachments", upload.single("file"), uploadAttachment);
router.post("/:id/read", markAsRead);

export default router;
