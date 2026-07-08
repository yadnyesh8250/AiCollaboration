import prisma from "../../config/db.js";
import { logTaskActivity } from "../task/task.controller.js";
import { sendNotification } from "../../services/notification.service.js";

// Helper to notify all workspace members
const notifyWorkspaceMembers = async (workspaceId, actorId, type, payload) => {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    const promises = members
      .filter(m => m.userId !== actorId)
      .map(m => sendNotification({
        recipientId: m.userId,
        actorId,
        type,
        payload
      }));
    await Promise.all(promises);
  } catch (err) {
    console.error("[Sprint Notification Helper] Error sending bulk notifications:", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/sprints
// ─────────────────────────────────────────────────────────────────────────────
export const createSprint = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    const sprint = await prisma.sprint.create({
      data: {
        workspaceId,
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "PLANNED"
      }
    });

    // Broadcast update
    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit("sprintCreated", sprint);
    }

    return res.status(201).json({ success: true, sprint });
  } catch (err) {
    console.error("[createSprint]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/sprints
// ─────────────────────────────────────────────────────────────────────────────
export const listSprints = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const sprints = await prisma.sprint.findMany({
      where: { workspaceId },
      orderBy: { startDate: "asc" },
      include: {
        tasks: { include: { task: true } }
      }
    });

    return res.status(200).json({ success: true, sprints });
  } catch (err) {
    console.error("[listSprints]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/sprints/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate, status } = req.body;

    const sprint = await prisma.sprint.findUnique({
      where: { id }
    });

    if (!sprint) {
      return res.status(404).json({ success: false, message: "Sprint not found." });
    }

    // Verify workspace role
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: sprint.workspaceId } }
    });
    if (!wsMember || !["OWNER", "ADMIN"].includes(wsMember.role)) {
      return res.status(403).json({ success: false, message: "Access denied. Only workspace admins can update sprints." });
    }

    const data = {};
    if (name) data.name = name;
    if (goal !== undefined) data.goal = goal;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);

    const oldStatus = sprint.status;
    if (status && status !== oldStatus) {
      // Validate transition rules
      if (status === "ACTIVE") {
        // Only one active sprint is allowed per workspace
        const activeSprint = await prisma.sprint.findFirst({
          where: { workspaceId: sprint.workspaceId, status: "ACTIVE" }
        });
        if (activeSprint) {
          return res.status(400).json({ success: false, message: "Another sprint is already active in this workspace." });
        }
      }

      data.status = status;
    }

    // Perform updates
    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data
    });

    // Special completed sprint logic: Move unfinished tasks back to the backlog
    if (status === "COMPLETED" && oldStatus !== "COMPLETED") {
      // Find all tasks in this sprint
      const sprintTasks = await prisma.sprintTask.findMany({
        where: { sprintId: id },
        include: { task: true }
      });

      // Unfinished tasks are tasks NOT completed ("DONE") and NOT "CANCELLED"
      const unfinishedTaskIds = sprintTasks
        .filter(st => st.task.status !== "DONE" && st.task.status !== "CANCELLED")
        .map(st => st.taskId);

      if (unfinishedTaskIds.length > 0) {
        console.log(`[Sprint] Shifting ${unfinishedTaskIds.length} unfinished tasks back to the backlog.`);
        
        // Remove SprintTask associations
        await prisma.sprintTask.deleteMany({
          where: {
            sprintId: id,
            taskId: { in: unfinishedTaskIds }
          }
        });

        // Log task activities for backlog shifting
        const activityPromises = unfinishedTaskIds.map(taskId =>
          logTaskActivity({
            taskId,
            actorId: req.user.id,
            action: "SPRINT_COMPLETED_BACKLOG",
            oldValue: sprint.name,
            newValue: "Backlog"
          })
        );
        await Promise.all(activityPromises);
      }

      // Notify all members
      await notifyWorkspaceMembers(sprint.workspaceId, req.user.id, "SPRINT_ENDED", {
        sprintId: id,
        name: updatedSprint.name
      });
    }

    if (status === "ACTIVE" && oldStatus !== "ACTIVE") {
      // Notify all members
      await notifyWorkspaceMembers(sprint.workspaceId, req.user.id, "SPRINT_STARTED", {
        sprintId: id,
        name: updatedSprint.name
      });
    }

    // Broadcast socket event
    if (req.io) {
      req.io.to(`workspace:${sprint.workspaceId}`).emit("sprintUpdated", updatedSprint);
    }

    return res.status(200).json({ success: true, sprint: updatedSprint });
  } catch (err) {
    console.error("[updateSprint]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sprints/:sprintId/tasks
// ─────────────────────────────────────────────────────────────────────────────
export const assignTaskToSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId is required." });
    }

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return res.status(404).json({ success: false, message: "Sprint not found." });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    // Validate they are in the same workspace
    if (sprint.workspaceId !== task.workspaceId) {
      return res.status(400).json({ success: false, message: "Task and Sprint must belong to the same workspace." });
    }

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const sprintTask = await prisma.sprintTask.create({
      data: { sprintId, taskId }
    });

    // Log activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "SPRINT_ADDED",
      newValue: sprint.name
    });

    // Broadcast
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskSprintAdded", { taskId, sprintId });
    }

    return res.status(201).json({ success: true, sprintTask });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Task is already in this sprint." });
    }
    console.error("[assignTaskToSprint]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/sprints/:sprintId/tasks/:taskId
// ─────────────────────────────────────────────────────────────────────────────
export const removeTaskFromSprint = async (req, res) => {
  try {
    const { sprintId, taskId } = req.params;

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return res.status(404).json({ success: false, message: "Sprint not found." });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    // Verify workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await prisma.sprintTask.delete({
      where: { sprintId_taskId: { sprintId, taskId } }
    });

    // Log activity
    await logTaskActivity({
      taskId,
      actorId: req.user.id,
      action: "SPRINT_REMOVED",
      oldValue: sprint.name
    });

    // Broadcast
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskSprintRemoved", { taskId, sprintId });
    }

    return res.status(200).json({ success: true, message: "Task removed from sprint." });
  } catch (err) {
    console.error("[removeTaskFromSprint]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
