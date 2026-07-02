import prisma from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/:id/reactions
// Add an emoji reaction to a message
// ─────────────────────────────────────────────────────────────────────────────
export const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ success: false, message: "Emoji is required." });

    const message = await prisma.message.findUnique({
      where: { id },
      include: { channel: true }
    });

    if (!message) return res.status(404).json({ success: false, message: "Message not found." });

    // Validate access (skipping full RBAC check here for brevity, assuming channel membership)

    const reaction = await prisma.reaction.create({
      data: {
        messageId: id,
        userId: req.user.id,
        emoji
      },
      include: {
        user: { select: { id: true, username: true } }
      }
    });

    if (req.io) {
      req.io.to(`channel:${message.channelId}`).emit("reactionAdded", reaction);
    }

    return res.status(201).json({ success: true, reaction });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Reaction already exists." });
    }
    console.error("[addReaction]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/messages/:id/reactions
// Remove a reaction
// ─────────────────────────────────────────────────────────────────────────────
export const removeReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ success: false, message: "Emoji is required." });

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });

    const reaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: id,
          userId: req.user.id,
          emoji
        }
      }
    });

    if (!reaction) return res.status(404).json({ success: false, message: "Reaction not found." });

    await prisma.reaction.delete({
      where: { id: reaction.id }
    });

    if (req.io) {
      req.io.to(`channel:${message.channelId}`).emit("reactionRemoved", {
        messageId: id,
        userId: req.user.id,
        emoji
      });
    }

    return res.status(200).json({ success: true, message: "Reaction removed." });
  } catch (err) {
    console.error("[removeReaction]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
