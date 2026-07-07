import prisma from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getWorkspaceDashboard = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this workspace." });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date();
    endOfWeek.setDate(startOfToday.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    // Run dashboard metrics queries in parallel
    const [
      openTasksCount,
      completedTodayCount,
      blockedTasksCount,
      recentDocuments,
      unreadMessagesCount,
      aiStats,
      upcomingDeadlines
    ] = await Promise.all([
      // 1. Count Open Tasks
      prisma.task.count({
        where: {
          workspaceId,
          status: { notIn: ["DONE", "CANCELLED"] }
        }
      }),

      // 2. Count Tasks Completed Today
      prisma.task.count({
        where: {
          workspaceId,
          status: "DONE",
          completedAt: { gte: startOfToday }
        }
      }),

      // 3. Count Blocked Tasks
      prisma.task.count({
        where: {
          workspaceId,
          status: "BLOCKED"
        }
      }),

      // 4. Fetch 5 Recent Documents
      prisma.document.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, slug: true, updatedAt: true }
      }),

      // 5. Count Unread Messages for this user in this workspace
      (async () => {
        const channels = await prisma.channel.findMany({
          where: { workspaceId, isArchived: false },
          select: { id: true }
        });
        const channelIds = channels.map(c => c.id);

        return prisma.message.count({
          where: {
            channelId: { in: channelIds },
            senderId: { not: req.user.id },
            reads: { none: { userId: req.user.id } }
          }
        });
      })(),

      // 6. Aggregate Workspace AI Usage
      prisma.aIAuditLog.aggregate({
        where: { workspaceId },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          estimatedCostUsd: true
        },
        _count: {
          id: true
        }
      }),

      // 7. Fetch Upcoming Deadlines (within 7 days)
      prisma.task.findMany({
        where: {
          workspaceId,
          dueDate: { gte: startOfToday, lte: endOfWeek },
          status: { notIn: ["DONE", "CANCELLED"] }
        },
        orderBy: { dueDate: "asc" },
        take: 10,
        select: { id: true, title: true, dueDate: true, status: true, priority: true }
      })
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        cards: {
          openTasks: openTasksCount,
          completedToday: completedTodayCount,
          blockedTasks: blockedTasksCount,
          unreadMessages: unreadMessagesCount,
          aiUsage: {
            callsCount: aiStats._count.id,
            totalTokens: (aiStats._sum.promptTokens || 0) + (aiStats._sum.completionTokens || 0),
            estimatedCostUsd: parseFloat(aiStats._sum.estimatedCostUsd || 0).toFixed(4)
          }
        },
        recentDocuments,
        upcomingDeadlines
      }
    });
  } catch (err) {
    console.error("[getWorkspaceDashboard]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/calendar
// ─────────────────────────────────────────────────────────────────────────────
export const getWorkspaceCalendar = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this workspace." });
    }

    // Fetch calendar events in parallel
    const [tasks, sprints] = await Promise.all([
      // Tasks with due date or start date
      prisma.task.findMany({
        where: {
          workspaceId,
          OR: [
            { dueDate: { not: null } },
            { startDate: { not: null } }
          ]
        },
        select: { id: true, title: true, startDate: true, dueDate: true, status: true, priority: true, type: true }
      }),

      // Sprints
      prisma.sprint.findMany({
        where: { workspaceId },
        select: { id: true, name: true, startDate: true, endDate: true, status: true }
      })
    ]);

    // Format events into a unified calendar feed
    const events = [];

    tasks.forEach(task => {
      if (task.dueDate) {
        events.push({
          id: `task-due-${task.id}`,
          title: `Due: ${task.title}`,
          start: task.dueDate,
          end: task.dueDate,
          allDay: true,
          type: "TASK_DUE",
          color: task.priority === "URGENT" ? "#ef4444" : task.priority === "HIGH" ? "#f97316" : "#3b82f6",
          meta: { taskId: task.id, status: task.status, priority: task.priority }
        });
      }

      if (task.startDate) {
        events.push({
          id: `task-start-${task.id}`,
          title: `Start: ${task.title}`,
          start: task.startDate,
          end: task.startDate,
          allDay: true,
          type: "TASK_START",
          color: "#10b981",
          meta: { taskId: task.id, status: task.status }
        });
      }
    });

    sprints.forEach(sprint => {
      events.push({
        id: `sprint-${sprint.id}`,
        title: sprint.name,
        start: sprint.startDate,
        end: sprint.endDate,
        allDay: true,
        type: "SPRINT",
        color: sprint.status === "ACTIVE" ? "#8b5cf6" : "#6b7280",
        meta: { sprintId: sprint.id, status: sprint.status }
      });
    });

    return res.status(200).json({ success: true, events });
  } catch (err) {
    console.error("[getWorkspaceCalendar]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
