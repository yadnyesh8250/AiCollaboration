import prisma from "../../config/db.js";
import { logTaskActivity } from "../task/task.controller.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tasks/:taskId/attachments
// ─────────────────────────────────────────────────────────────────────────────
export const uploadTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });

    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied. Viewers cannot upload attachments." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: req.file.originalname,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user.id
      }
    });

    // Log activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "ATTACHMENT_ADDED",
      newValue: req.file.originalname
    });

    // Broadcast
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskAttachmentAdded", { taskId, attachment });
    }

    return res.status(201).json({ success: true, attachment });
  } catch (err) {
    console.error("[uploadTaskAttachment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/attachments/:id (For TaskAttachment)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTaskAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: "Attachment not found." });
    }

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: attachment.task.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isUploader = attachment.uploadedBy === req.user.id;

    if (!isWsAdmin && !isUploader) {
      return res.status(403).json({ success: false, message: "Access denied. Only the uploader or workspace admins can delete this attachment." });
    }

    await prisma.taskAttachment.delete({ where: { id } });

    // Log activity
    await logTaskActivity({
      taskId: attachment.taskId,
      actorId: req.user.id,
      action: "ATTACHMENT_REMOVED",
      oldValue: attachment.fileName
    });

    // Broadcast
    if (req.io) {
      req.io.to(`workspace:${attachment.task.workspaceId}`).emit("taskAttachmentRemoved", { taskId: attachment.taskId, attachmentId: id });
    }

    return res.status(200).json({ success: true, message: "Attachment deleted." });
  } catch (err) {
    console.error("[deleteTaskAttachment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
