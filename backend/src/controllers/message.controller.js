import prisma from "../config/db.js";
import { processMentions } from "../services/mention.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/channels/:channelId/messages
// Send a message in a channel (also handles threads if parentMessageId is provided)
// ─────────────────────────────────────────────────────────────────────────────
export const createMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, messageType = "TEXT", parentMessageId } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required." });
    }

    // Verify channel access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    if (channel.type === "PRIVATE") {
      const isMember = channel.members.some(m => m.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    } else {
      // Must be a member of the workspace for public channels
      const wsMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: req.user.id, workspaceId: channel.workspaceId } }
      });
      if (!wsMember) {
        return res.status(403).json({ success: false, message: "Access denied to workspace." });
      }
    }

    // If parentMessageId, ensure it exists in the same channel
    if (parentMessageId) {
      const parent = await prisma.message.findUnique({ where: { id: parentMessageId } });
      if (!parent || parent.channelId !== channelId) {
        return res.status(400).json({ success: false, message: "Invalid parent message." });
      }
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        senderId: req.user.id,
        content,
        messageType,
        parentMessageId
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Process Mentions
    await processMentions(content, message.id, req.user.id, channelId);

    // Broadcast via socket
    if (req.io) {
      req.io.to(`channel:${channelId}`).emit("receiveMessage", message);
    }

    return res.status(201).json({ success: true, message });
  } catch (err) {
    console.error("[createMessage]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/channels/:channelId/messages
// Get messages with cursor pagination
// ─────────────────────────────────────────────────────────────────────────────
export const listMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = 30 } = req.query;

    const parsedLimit = parseInt(limit, 10);

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true }
    });

    if (!channel) return res.status(404).json({ success: false, message: "Channel not found." });

    if (channel.type === "PRIVATE") {
      const isMember = channel.members.some(m => m.userId === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    }

    // Prisma cursor pagination
    const query = {
      where: { channelId, parentMessageId: null }, // Only main feed, no threads
      take: parsedLimit + 1, // take 1 extra to see if there's a next page
      orderBy: { createdAt: 'asc' }, // oldest first
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        reactions: true,
        attachments: true,
        _count: { select: { replies: true } }
      }
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1; // skip the cursor itself
    }

    const messages = await prisma.message.findMany(query);

    let nextCursor = null;
    if (messages.length > parsedLimit) {
      const nextItem = messages.pop(); // remove the extra item
      nextCursor = nextItem.id;
    }

    // Mask deleted messages
    const processedMessages = messages.map(m => {
      if (m.deletedAt) {
        return {
          ...m,
          content: "This message was deleted.",
          attachments: []
        };
      }
      return m;
    });

    return res.status(200).json({ 
      success: true, 
      messages: processedMessages,
      nextCursor 
    });
  } catch (err) {
    console.error("[listMessages]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/:messageId/thread
// Get thread replies
// ─────────────────────────────────────────────────────────────────────────────
export const getThread = async (req, res) => {
  try {
    const { messageId } = req.params;

    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    if (!parentMessage) return res.status(404).json({ success: false, message: "Message not found." });

    const replies = await prisma.message.findMany({
      where: { parentMessageId: messageId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        reactions: true,
        attachments: true
      }
    });

    const processMessage = (m) => m.deletedAt ? { ...m, content: "This message was deleted.", attachments: [] } : m;

    return res.status(200).json({ 
      success: true, 
      parentMessage: processMessage(parentMessage),
      replies: replies.map(processMessage)
    });
  } catch (err) {
    console.error("[getThread]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/messages/:id
// Edit a message
// ─────────────────────────────────────────────────────────────────────────────
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ success: false, message: "Content is required." });

    const message = await prisma.message.findUnique({ where: { id } });
    
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    if (message.senderId !== req.user.id) return res.status(403).json({ success: false, message: "You can only edit your own messages." });
    if (message.deletedAt) return res.status(400).json({ success: false, message: "Cannot edit a deleted message." });

    const updated = await prisma.message.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Re-process Mentions in case they changed
    await processMentions(content, updated.id, req.user.id, updated.channelId);

    if (req.io) {
      req.io.to(`channel:${updated.channelId}`).emit("editMessage", updated);
    }

    return res.status(200).json({ success: true, message: updated });
  } catch (err) {
    console.error("[editMessage]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/messages/:id
// Soft delete a message
// ─────────────────────────────────────────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    if (message.senderId !== req.user.id) return res.status(403).json({ success: false, message: "You can only delete your own messages." });
    if (message.deletedAt) return res.status(400).json({ success: false, message: "Message is already deleted." });

    const deleted = await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    if (req.io) {
      req.io.to(`channel:${deleted.channelId}`).emit("deleteMessage", { messageId: id, channelId: deleted.channelId });
    }

    return res.status(200).json({ success: true, message: "Message deleted." });
  } catch (err) {
    console.error("[deleteMessage]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
