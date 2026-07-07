import prisma from "../../config/db.js";
import { logTaskActivity } from "../task/task.controller.js";
import { sendNotification } from "../../services/notification.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// TASK COMMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const createTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "content is required." });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Check workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: req.user.id,
        content
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Log task activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "COMMENT_ADDED",
      newValue: content.substring(0, 50)
    });

    // Send notifications to creator and assignee (if not author)
    const notificationPromises = [];
    if (task.createdBy !== req.user.id) {
      notificationPromises.push(
        sendNotification({
          recipientId: task.createdBy,
          actorId: req.user.id,
          type: "COMMENT_ADDED",
          payload: { taskId, commentId: comment.id, title: task.title }
        })
      );
    }
    if (task.assignedTo && task.assignedTo !== req.user.id && task.assignedTo !== task.createdBy) {
      notificationPromises.push(
        sendNotification({
          recipientId: task.assignedTo,
          actorId: req.user.id,
          type: "COMMENT_ADDED",
          payload: { taskId, commentId: comment.id, title: task.title }
        })
      );
    }
    await Promise.all(notificationPromises);

    // Socket broadcast
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskCommentCreated", { taskId, comment });
    }

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("[createTaskComment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Check workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return res.status(200).json({ success: true, comments });
  } catch (err) {
    console.error("[listTaskComments]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const updateTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "content is required." });
    }

    const comment = await prisma.taskComment.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied. Only the author can edit this comment." });
    }

    const updated = await prisma.taskComment.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } }
    });

    if (req.io) {
      req.io.to(`workspace:${comment.task.workspaceId}`).emit("taskCommentUpdated", { taskId: comment.taskId, comment: updated });
    }

    return res.status(200).json({ success: true, comment: updated });
  } catch (err) {
    console.error("[updateTaskComment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const deleteTaskComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.taskComment.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: comment.task.workspaceId } }
    });

    const isAuthor = comment.authorId === req.user.id;
    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);

    if (!isAuthor && !isWsAdmin) {
      return res.status(403).json({ success: false, message: "Access denied. Only the author or workspace admins can delete this comment." });
    }

    await prisma.taskComment.delete({ where: { id } });

    if (req.io) {
      req.io.to(`workspace:${comment.task.workspaceId}`).emit("taskCommentDeleted", { taskId: comment.taskId, commentId: id });
    }

    return res.status(200).json({ success: true, message: "Comment deleted successfully." });
  } catch (err) {
    console.error("[deleteTaskComment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT COMMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const createDocumentComment = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "content is required." });
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    // Verify workspace member access
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Check specific document permissions (Viewer cannot comment)
    const docPermission = await prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId: req.user.id } }
    });

    if (docPermission && docPermission.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Viewers cannot comment on this document." });
    }

    const comment = await prisma.documentComment.create({
      data: {
        documentId,
        authorId: req.user.id,
        content
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Notify document creator
    if (doc.createdBy !== req.user.id) {
      await sendNotification({
        recipientId: doc.createdBy,
        actorId: req.user.id,
        type: "COMMENT_ADDED",
        payload: { documentId, commentId: comment.id, title: doc.title }
      });
    }

    // Broadcast to workspace
    if (req.io) {
      req.io.to(`workspace:${doc.workspaceId}`).emit("documentCommentCreated", { documentId, comment });
    }

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("[createDocumentComment]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listDocumentComments = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found." });
    }

    // Check workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const comments = await prisma.documentComment.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    return res.status(200).json({ success: true, comments });
  } catch (err) {
    console.error("[listDocumentComments]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
