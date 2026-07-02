import prisma from "../config/db.js";
import { logAction } from "../services/audit.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/channels
// Create a channel (OWNER/ADMIN/MEMBER can create, VIEWER cannot)
// ─────────────────────────────────────────────────────────────────────────────
export const createChannel = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, slug, description, type = "PUBLIC" } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "name and slug are required." });
    }

    if (req.workspaceMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Viewers cannot create channels." });
    }

    const channel = await prisma.channel.create({
      data: {
        workspaceId,
        name,
        slug,
        description,
        type,
        createdBy: req.user.id
      }
    });

    // If private, add creator as admin
    if (type === "PRIVATE") {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: req.user.id,
          role: "ADMIN"
        }
      });
    }

    await logAction({
      actorId: req.user.id,
      workspaceId,
      action: "CHANNEL_CREATED",
      entityType: "CHANNEL",
      entityId: channel.id,
      metadata: { name, type }
    });

    // Broadcast event
    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit("channelCreated", channel);
    }

    return res.status(201).json({ success: true, channel });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Channel slug already used in this workspace." });
    }
    console.error("[createChannel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/channels
// List accessible channels in a workspace
// ─────────────────────────────────────────────────────────────────────────────
export const listChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Get public channels + private channels the user is a member of
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        isArchived: false,
        OR: [
          { type: { in: ["PUBLIC", "ANNOUNCEMENT", "AI"] } },
          { 
            type: "PRIVATE",
            members: { some: { userId: req.user.id } }
          }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({ success: true, channels });
  } catch (err) {
    console.error("[listChannels]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/channels/:channelId
// Get details of a single channel
// ─────────────────────────────────────────────────────────────────────────────
export const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: { include: { user: { select: { id: true, username: true, email: true } } } }
      }
    });

    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }

    if (channel.type === "PRIVATE") {
      const isMember = channel.members.some(m => m.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Access denied to private channel." });
      }
    }

    return res.status(200).json({ success: true, channel });
  } catch (err) {
    console.error("[getChannel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/channels/:channelId
// Update channel (Requires Workspace ADMIN/OWNER or Channel ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
export const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description, isArchived } = req.body;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    // We need to check if user is Workspace Admin/Owner OR Channel Admin.
    // Wait, we don't have req.workspaceMember populated by requireWorkspaceRole since this is a flat route (/api/channels/:id).
    // Let's manually fetch workspace membership.
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: channel.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isChannelAdmin = channel.members.some(m => m.userId === req.user.id && m.role === "ADMIN");

    if (!isWsAdmin && !isChannelAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins can update channels." });
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isArchived !== undefined && { isArchived })
      }
    });

    if (req.io) {
      req.io.to(`workspace:${channel.workspaceId}`).emit("channelUpdated", updated);
    }

    return res.status(200).json({ success: true, channel: updated });
  } catch (err) {
    console.error("[updateChannel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/channels/:channelId
// Delete a channel
// ─────────────────────────────────────────────────────────────────────────────
export const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: channel.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isChannelAdmin = channel.members.some(m => m.userId === req.user.id && m.role === "ADMIN");

    if (!isWsAdmin && !isChannelAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins can delete channels." });
    }

    await prisma.channel.delete({ where: { id: channelId } });

    await logAction({
      actorId: req.user.id,
      workspaceId: channel.workspaceId,
      action: "CHANNEL_DELETED",
      entityType: "CHANNEL",
      entityId: channelId
    });

    if (req.io) {
      req.io.to(`workspace:${channel.workspaceId}`).emit("channelDeleted", { channelId });
    }

    return res.status(200).json({ success: true, message: "Channel deleted." });
  } catch (err) {
    console.error("[deleteChannel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
