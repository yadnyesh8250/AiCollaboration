import prisma from "../../config/db.js";
import { logTaskActivity } from "../task/task.controller.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/labels
// ─────────────────────────────────────────────────────────────────────────────
export const createLabel = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ success: false, message: "name and color are required." });
    }

    const label = await prisma.label.create({
      data: {
        workspaceId,
        name,
        color
      }
    });

    return res.status(201).json({ success: true, label });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Label name already exists in this workspace." });
    }
    console.error("[createLabel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/labels
// ─────────────────────────────────────────────────────────────────────────────
export const listLabels = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const labels = await prisma.label.findMany({
      where: { workspaceId }
    });

    return res.status(200).json({ success: true, labels });
  } catch (err) {
    console.error("[listLabels]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/labels/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteLabel = async (req, res) => {
  try {
    const { id } = req.params;

    const label = await prisma.label.findUnique({
      where: { id }
    });

    if (!label) {
      return res.status(404).json({ success: false, message: "Label not found." });
    }

    // Check workspace roles (OWNER/ADMIN only)
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: label.workspaceId } }
    });

    if (!wsMember || !["OWNER", "ADMIN"].includes(wsMember.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Only admins can delete labels." });
    }

    await prisma.label.delete({
      where: { id }
    });

    return res.status(200).json({ success: true, message: "Label deleted successfully." });
  } catch (err) {
    console.error("[deleteLabel]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tasks/:taskId/labels
// ─────────────────────────────────────────────────────────────────────────────
export const assignLabelToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { labelId } = req.body;

    if (!labelId) {
      return res.status(400).json({ success: false, message: "labelId is required." });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) return res.status(404).json({ success: false, message: "Label not found." });

    // Validate that task and label are in the same workspace
    if (task.workspaceId !== label.workspaceId) {
      return res.status(400).json({ success: false, message: "Task and label must belong to the same workspace." });
    }

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const taskLabel = await prisma.taskLabel.create({
      data: { taskId, labelId }
    });

    // Log activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "LABEL_ADDED",
      newValue: label.name
    });

    // Broadcast update
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskLabelAdded", { taskId, label });
    }

    return res.status(201).json({ success: true, taskLabel });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Label is already assigned to this task." });
    }
    console.error("[assignLabelToTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:taskId/labels/:labelId
// ─────────────────────────────────────────────────────────────────────────────
export const removeLabelFromTask = async (req, res) => {
  try {
    const { taskId, labelId } = req.params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    const label = await prisma.label.findUnique({ where: { id: labelId } });
    if (!label) return res.status(404).json({ success: false, message: "Label not found." });

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } }
    });

    // Log activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "LABEL_REMOVED",
      oldValue: label.name
    });

    // Broadcast update
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskLabelRemoved", { taskId, labelId });
    }

    return res.status(200).json({ success: true, message: "Label removed from task." });
  } catch (err) {
    console.error("[removeLabelFromTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
