import prisma from "../../config/db.js";
import { sendNotification } from "../../services/notification.service.js";

// Helper to log task activities
export const logTaskActivity = async ({ taskId, actorId, action, oldValue = null, newValue = null }) => {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId,
        actorId,
        action,
        oldValue: oldValue !== null ? String(oldValue) : null,
        newValue: newValue !== null ? String(newValue) : null
      }
    });
  } catch (err) {
    console.error("[logTaskActivity] Failed to log activity:", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/tasks
// ─────────────────────────────────────────────────────────────────────────────
export const createTask = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      title,
      description,
      status = "TODO",
      priority = "MEDIUM",
      type = "TASK",
      assignedTo,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      position
    } = req.body;

    // Verify assignedTo user is a workspace member (if provided)
    if (assignedTo) {
      const isMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: assignedTo, workspaceId } }
      });
      if (!isMember) {
        return res.status(400).json({ success: false, message: "Assignee must be a member of this workspace." });
      }
    }

    // Calculate position if not provided
    let calculatedPosition = position;
    if (calculatedPosition === undefined) {
      const maxTask = await prisma.task.findFirst({
        where: { workspaceId, status },
        orderBy: { position: "desc" },
        select: { position: true }
      });
      calculatedPosition = maxTask ? maxTask.position + 1000.0 : 1000.0;
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title,
        description,
        status,
        priority,
        type,
        createdBy: req.user.id,
        assignedTo: assignedTo || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours !== undefined ? parseFloat(estimatedHours) : null,
        actualHours: actualHours !== undefined ? parseFloat(actualHours) : null,
        position: parseFloat(calculatedPosition)
      },
      include: {
        creator: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, username: true, email: true, firstName: true, lastName: true } }
      }
    });

    // Log creation activity
    await logTaskActivity({
      taskId: task.id,
      actorId: req.user.id,
      action: "CREATE",
      newValue: task.title
    });

    // Notify assignee
    if (assignedTo && assignedTo !== req.user.id) {
      await sendNotification({
        recipientId: assignedTo,
        actorId: req.user.id,
        type: "TASK_ASSIGNED",
        payload: { taskId: task.id, title: task.title }
      });
    }

    // Broadcast to workspace
    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit("taskCreated", task);
    }

    return res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("[createTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/tasks
// ─────────────────────────────────────────────────────────────────────────────
export const listTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status, priority, type, assignedTo, sprintId, search } = req.query;

    const filters = { workspaceId };

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (type) filters.type = type;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (sprintId) {
      filters.sprints = { some: { sprintId } };
    }

    if (search) {
      filters.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const tasks = await prisma.task.findMany({
      where: filters,
      orderBy: [
        { status: "asc" },
        { position: "asc" }
      ],
      include: {
        creator: { select: { id: true, username: true, email: true } },
        assignee: { select: { id: true, username: true, email: true } },
        labels: { include: { label: true } },
        sprints: { include: { sprint: true } }
      }
    });

    return res.status(200).json({ success: true, tasks });
  } catch (err) {
    console.error("[listTasks]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/:taskId
// ─────────────────────────────────────────────────────────────────────────────
export const getTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, username: true, avatarUrl: true } } }
        },
        attachments: true,
        activities: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { id: true, username: true, firstName: true, lastName: true } } }
        },
        labels: { include: { label: true } },
        sprints: { include: { sprint: true } }
      }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // RBAC verification: check if user belongs to this task's workspace
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this workspace." });
    }

    return res.status(200).json({ success: true, task });
  } catch (err) {
    console.error("[getTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tasks/:taskId
// ─────────────────────────────────────────────────────────────────────────────
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

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
      return res.status(403).json({ success: false, message: "Access denied. Only members can update tasks." });
    }



    // Verify assignee user exists in workspace if changing it
    if (updates.assignedTo) {
      const isMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: updates.assignedTo, workspaceId: task.workspaceId } }
      });
      if (!isMember) {
        return res.status(400).json({ success: false, message: "Assignee must be a member of this workspace." });
      }
    }

    // Build update payload and log activities for changes
    const data = {};
    const logPromises = [];

    const trackableFields = [
      "title",
      "description",
      "status",
      "priority",
      "type",
      "assignedTo",
      "startDate",
      "dueDate",
      "estimatedHours",
      "actualHours",
      "position"
    ];

    for (const field of trackableFields) {
      if (updates[field] !== undefined && updates[field] !== task[field]) {
        let oldValue = task[field];
        let newValue = updates[field];

        if (field === "startDate" || field === "dueDate") {
          data[field] = newValue ? new Date(newValue) : null;
          oldValue = oldValue ? oldValue.toISOString() : null;
          newValue = newValue ? new Date(newValue).toISOString() : null;
        } else if (field === "estimatedHours" || field === "actualHours" || field === "position") {
          data[field] = newValue !== null ? parseFloat(newValue) : null;
        } else {
          data[field] = newValue;
        }

        logPromises.push(
          logTaskActivity({
            taskId,
            actorId: req.user.id,
            action: field.toUpperCase(),
            oldValue,
            newValue
          })
        );
      }
    }

    // Specific logic for completions
    if (updates.status !== undefined && updates.status !== task.status) {
      if (updates.status === "DONE") {
        data.completedAt = new Date();
        // Send notification to task creator
        if (task.createdBy !== req.user.id) {
          logPromises.push(
            sendNotification({
              recipientId: task.createdBy,
              actorId: req.user.id,
              type: "TASK_COMPLETED",
              payload: { taskId: task.id, title: task.title }
            })
          );
        }
      } else {
        data.completedAt = null;
      }
    }

    // Execute updates
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        creator: { select: { id: true, username: true, email: true } },
        assignee: { select: { id: true, username: true, email: true } }
      }
    });

    await Promise.all(logPromises);

    // Send assignment notification if assignee changed
    if (updates.assignedTo !== undefined && updates.assignedTo !== task.assignedTo && updates.assignedTo !== null) {
      if (updates.assignedTo !== req.user.id) {
        await sendNotification({
          recipientId: updates.assignedTo,
          actorId: req.user.id,
          type: "TASK_ASSIGNED",
          payload: { taskId: updatedTask.id, title: updatedTask.title }
        });
      }
    }

    // Broadcast to workspace room
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskUpdated", updatedTask);
    }

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (err) {
    console.error("[updateTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:taskId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Verify workspace role: Admin or Owner or Creator of the task can delete
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });

    const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
    const isCreator = task.createdBy === req.user.id;

    if (!isWsAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins or Task Creators can delete tasks." });
    }

    await prisma.task.delete({ where: { id: taskId } });

    // Broadcast delete event
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskDeleted", { taskId });
    }

    return res.status(200).json({ success: true, message: "Task deleted successfully." });
  } catch (err) {
    console.error("[deleteTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tasks/:taskId/status (Kanban drag and drop updates)
// ─────────────────────────────────────────────────────────────────────────────
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;

    if (!status || position === undefined) {
      return res.status(400).json({ success: false, message: "status and position are required." });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Verify workspace member role
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId: task.workspaceId } }
    });
    if (!wsMember || wsMember.role === "VIEWER") {
      return res.status(403).json({ success: false, message: "Access denied. Viewers cannot modify tasks." });
    }

    const oldStatus = task.status;
    const oldPosition = task.position;

    const data = {
      status,
      position: parseFloat(position)
    };

    if (status === "DONE" && oldStatus !== "DONE") {
      data.completedAt = new Date();
    } else if (status !== "DONE" && oldStatus === "DONE") {
      data.completedAt = null;
    }

    let updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        creator: { select: { id: true, username: true, email: true } },
        assignee: { select: { id: true, username: true, email: true } }
      }
    });

    // Log activity
    const logPromises = [];
    if (oldStatus !== status) {
      logPromises.push(
        logTaskActivity({
          taskId,
          actorId: req.user.id,
          action: "STATUS",
          oldValue: oldStatus,
          newValue: status
        })
      );
      if (status === "DONE" && task.createdBy !== req.user.id) {
        logPromises.push(
          sendNotification({
            recipientId: task.createdBy,
            actorId: req.user.id,
            type: "TASK_COMPLETED",
            payload: { taskId: task.id, title: task.title }
          })
        );
      }
    }
    if (oldPosition !== position) {
      logPromises.push(
        logTaskActivity({
          taskId,
          actorId: req.user.id,
          action: "POSITION",
          oldValue: oldPosition,
          newValue: position
        })
      );
    }

    await Promise.all(logPromises);

    // Check for position collision & perform re-spacing if needed
    // Find tasks in this status column sorted by position
    const siblingTasks = await prisma.task.findMany({
      where: { workspaceId: task.workspaceId, status },
      orderBy: { position: "asc" }
    });

    let collisionDetected = false;
    for (let i = 0; i < siblingTasks.length - 1; i++) {
      if (Math.abs(siblingTasks[i+1].position - siblingTasks[i].position) < 0.00001) {
        collisionDetected = true;
        break;
      }
    }

    if (collisionDetected) {
      console.log(`[Kanban] Collision detected for status ${status}. Re-spacing...`);
      const updatePromises = siblingTasks.map((t, idx) => {
        const newPos = (idx + 1) * 1000.0;
        return prisma.task.update({
          where: { id: t.id },
          data: { position: newPos }
        });
      });
      await Promise.all(updatePromises);
      
      // Fetch the updated task state after re-spacing
      updatedTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          creator: { select: { id: true, username: true, email: true } },
          assignee: { select: { id: true, username: true, email: true } }
        }
      });
    }

    // Broadcast update
    if (req.io) {
      req.io.to(`workspace:${task.workspaceId}`).emit("taskUpdated", updatedTask);
    }

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (err) {
    console.error("[updateTaskStatus]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
