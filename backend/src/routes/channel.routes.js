import { Router } from "express";
import {
  createChannel,
  listChannels,
  getChannel,
  updateChannel,
  deleteChannel
} from "../controllers/channel.controller.js";
import {
  addChannelMember,
  removeChannelMember,
  listChannelMembers
} from "../controllers/channelMember.controller.js";
import messageRoutes from "./message.routes.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";

const router = Router({ mergeParams: true });

router.use(protect);

// Nested under /api/workspaces/:workspaceId/channels
router.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createChannel);
router.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listChannels);

// Nested messages
router.use("/:channelId/messages", messageRoutes);

// Flat routes under /api/channels
router.get("/:channelId", getChannel);
router.patch("/:channelId", updateChannel);
router.delete("/:channelId", deleteChannel);

// Member management for private channels
router.post("/:id/members", addChannelMember);
router.get("/:id/members", listChannelMembers);
router.delete("/:id/members/:userId", removeChannelMember);

export default router;
