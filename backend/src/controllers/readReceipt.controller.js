import prisma from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/:id/read
// Mark a message as read
// ─────────────────────────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: { channel: true }
    });

    if (!message) return res.status(404).json({ success: false, message: "Message not found." });

    // Insert or update the read receipt
    const readReceipt = await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId: id,
          userId: req.user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        messageId: id,
        userId: req.user.id
      }
    });

    if (req.io) {
      req.io.to(`channel:${message.channelId}`).emit("messageRead", {
        messageId: id,
        userId: req.user.id,
        readAt: readReceipt.readAt
      });
    }

    return res.status(200).json({ success: true, readReceipt });
  } catch (err) {
    console.error("[markAsRead]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
