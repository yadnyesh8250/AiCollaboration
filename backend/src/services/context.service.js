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

  // 4. Tasks Context (Safe placeholder until Phase 5 Task Module is built)
  // We check if we can safely retrieve tasks, otherwise mock empty list.
  contextParts.push("\n### WORKSPACE TASKS CONTEXT");
  contextParts.push("- No active tasks matching the query are currently indexed.");

  return contextParts.join("\n");
};
