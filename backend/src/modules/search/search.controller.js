import prisma from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search?q=query&workspaceId=uuid
// ─────────────────────────────────────────────────────────────────────────────
export const globalSearch = async (req, res) => {
  try {
    const { q, workspaceId } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "Query string parameter q is required." });
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required." });
    }

    // Verify workspace membership
    const isMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } }
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this workspace." });
    }

    // Execute parallel searches across database tables
    const [tasks, documents, messages, channels, knowledge, members] = await Promise.all([
      // 1. Tasks matching title or description
      prisma.task.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } }
          ]
        },
        select: { id: true, title: true, description: true, status: true, priority: true, type: true }
      }),

      // 2. Documents matching title
      prisma.document.findMany({
        where: {
          workspaceId,
          title: { contains: q }
        },
        select: { id: true, title: true, slug: true }
      }),

      // 3. Messages in workspace channels (excluding archived) matching content
      prisma.message.findMany({
        where: {
          channel: { workspaceId, isArchived: false },
          content: { contains: q }
        },
        select: { 
          id: true, 
          content: true, 
          createdAt: true, 
          sender: { select: { username: true } }, 
          channel: { select: { name: true } } 
        }
      }),

      // 4. Channels matching name or description
      prisma.channel.findMany({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } }
          ]
        },
        select: { id: true, name: true, slug: true, description: true }
      }),

      // 5. RAG Knowledge matching title or content
      prisma.workspaceKnowledge.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: q } },
            { content: { contains: q } }
          ]
        },
        select: { id: true, title: true, category: true }
      }),

      // 6. Workspace Members matching names, username or email
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          user: {
            OR: [
              { username: { contains: q } },
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } }
            ]
          }
        },
        include: { user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, avatarUrl: true } } }
      })
    ]);

    const totalResults = tasks.length + documents.length + messages.length + channels.length + knowledge.length + members.length;

    return res.status(200).json({
      success: true,
      query: q,
      totalResults,
      results: {
        tasks,
        documents,
        messages,
        channels,
        knowledge,
        members: members.map(m => m.user)
      }
    });
  } catch (err) {
    console.error("[globalSearch]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
