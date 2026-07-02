import prisma from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/channels/:id/members
// Add a member to a private channel
// ─────────────────────────────────────────────────────────────────────────────
export const addChannelMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "MEMBER" } = req.body;

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    if (channel.type !== "PRIVATE") {
      return res.status(400).json({ success: false, message: "Only private channels require explicit membership." });
    }

    // Must be Workspace Admin or Channel Admin
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: channel.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isChannelAdmin = channel.members.some(m => m.userId === req.user.id && m.role === "ADMIN");

    if (!isWsAdmin && !isChannelAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins can add members." });
    }

    // Verify user is in the workspace
    const targetWsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: channel.workspaceId } }
    });

    if (!targetWsMember) {
      return res.status(400).json({ success: false, message: "Target user is not a member of this workspace." });
    }

    const member = await prisma.channelMember.create({
      data: {
        channelId: id,
        userId,
        role
      }
    });

    return res.status(201).json({ success: true, member });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "User is already a member of this channel." });
    }
    console.error("[addChannelMember]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/channels/:id/members/:userId
// Remove a member from a private channel
// ─────────────────────────────────────────────────────────────────────────────
export const removeChannelMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: channel.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isChannelAdmin = channel.members.some(m => m.userId === req.user.id && m.role === "ADMIN");
    const isSelf = req.user.id === userId;

    if (!isWsAdmin && !isChannelAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const targetMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId } }
    });

    if (!targetMember) {
      return res.status(404).json({ success: false, message: "User is not a member of this channel." });
    }

    await prisma.channelMember.delete({
      where: { id: targetMember.id }
    });

    return res.status(200).json({ success: true, message: "Member removed." });
  } catch (err) {
    console.error("[removeChannelMember]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/channels/:id/members
// List members of a private channel
// ─────────────────────────────────────────────────────────────────────────────
export const listChannelMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, email: true } } } } }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    if (channel.type === "PRIVATE") {
      const isMember = channel.members.some(m => m.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Access denied to private channel." });
      }
    }

    return res.status(200).json({ success: true, members: channel.members });
  } catch (err) {
    console.error("[listChannelMembers]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
