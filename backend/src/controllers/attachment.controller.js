import prisma from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/:id/attachments
// Upload an attachment (multipart/form-data handled by multer middleware in route)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: { channel: true }
    });

    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    if (message.senderId !== req.user.id) return res.status(403).json({ success: false, message: "Can only attach to your own message." });

    const fileUrl = `/uploads/${req.file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        messageId: id,
        fileName: req.file.originalname,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user.id
      }
    });

    // Notify channel of attachment update (or emit messageUpdated)
    if (req.io) {
      req.io.to(`channel:${message.channelId}`).emit("attachmentAdded", attachment);
    }

    return res.status(201).json({ success: true, attachment });
  } catch (err) {
    console.error("[uploadAttachment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/attachments/:id
// Delete an attachment
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { message: true }
    });

    if (!attachment) return res.status(404).json({ success: false, message: "Attachment not found." });
    
    // Only uploader can delete
    if (attachment.uploadedBy !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await prisma.attachment.delete({ where: { id } });

    if (req.io) {
      req.io.to(`channel:${attachment.message.channelId}`).emit("attachmentRemoved", { attachmentId: id, messageId: attachment.messageId });
    }

    // In a real app, you would also fs.unlinkSync the file from /uploads here.

    return res.status(200).json({ success: true, message: "Attachment deleted." });
  } catch (err) {
    console.error("[deleteAttachment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
