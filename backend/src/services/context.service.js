import prisma from "../config/db.js";

/**
 * RAG Context Engine
 * Queries and ranks workspace metadata, knowledge pages, memory, and messages.
 */
export const buildRAGContext = async ({ workspaceId, channelId, query }) => {
  let contextParts = [];

  // 1. Fetch Workspace Memory (Score 0.8 weight)
  const memory = await prisma.workspaceMemory.findMany({
    where: { workspaceId }
  });
  if (memory.length > 0) {
    contextParts.push("### PERSISTENT WORKSPACE MEMORY");
    memory.forEach(m => {
      contextParts.push(`- ${m.key}: ${m.value}`);
    });
  }

  // 2. Fetch Workspace Knowledge Base (Score 1.0 weight)
  // Initially we search by simple SQL LIKE queries. Later this can be semantic vector matching.
  const knowledge = await prisma.workspaceKnowledge.findMany({
    where: {
      workspaceId,
      OR: [
        { title: { contains: query } },
        { content: { contains: query } }
      ]
    },
    take: 5
  });
  if (knowledge.length > 0) {
    contextParts.push("\n### WORKSPACE KNOWLEDGE BASE");
    knowledge.forEach(k => {
      contextParts.push(`Category: ${k.category} | Title: ${k.title}\nContent: ${k.content}\n`);
    });
  }

  // 3. Fetch Recent Channel Messages (Score 0.4 weight)
  if (channelId) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    const channelName = channel?.name || "current-channel";

    const messages = await prisma.message.findMany({
      where: { 
        channelId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { sender: { select: { username: true } } }
    });

    if (messages.length > 0) {
      contextParts.push(`\n### CHANNEL MESSAGES CONTEXT [#${channelName}]`);
      // Reverse messages to show them in chronological order in the prompt
      messages.reverse().forEach(m => {
        contextParts.push(`@${m.sender.username} (${m.createdAt.toISOString()}): "${m.content}"`);
      });
    }
  }

  // 4. Tasks Context (Query real active tasks from database)
  try {
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      take: 15,
      include: {
        assignee: { select: { username: true } },
        sprint: { select: { name: true } }
      }
    });

    if (tasks.length > 0) {
      contextParts.push("\n### WORKSPACE TASKS CONTEXT");
      tasks.forEach(t => {
        const assigneeStr = t.assignee ? `@${t.assignee.username}` : "Unassigned";
        const sprintStr = t.sprint ? `Sprint: ${t.sprint.name}` : "No Sprint";
        const dueStr = t.dueDate ? `Due: ${new Date(t.dueDate).toLocaleDateString()}` : "No due date";
        contextParts.push(`- Task: "${t.title}" | Status: ${t.status} | Assignee: ${assigneeStr} | Priority: ${t.priority} | ${sprintStr} | ${dueStr}`);
      });
    } else {
      contextParts.push("\n### WORKSPACE TASKS CONTEXT");
      contextParts.push("- No active tasks are currently indexed in this workspace.");
    }
  } catch (err) {
    console.error("Failed to query tasks for RAG context:", err);
  }

  return contextParts.join("\n");
};
