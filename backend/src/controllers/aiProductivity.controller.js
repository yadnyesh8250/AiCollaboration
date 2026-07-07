import prisma from "../config/db.js";
import { queryModelJSON, queryModel } from "../services/llm.service.js";
import { logTaskActivity } from "../modules/task/task.controller.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/ai/task-generate
// ─────────────────────────────────────────────────────────────────────────────
export const generateTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "prompt is required." });
    }

    const systemInstruction = `You are a project manager assistant. Given a user request, you must break it down into a logical list of tasks.
Your response MUST be valid JSON matching the following schema:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Short explanation of what needs to be done",
      "type": "TASK | BUG | FEATURE | EPIC | STORY | SUBTASK",
      "priority": "LOW | MEDIUM | HIGH | URGENT",
      "status": "TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED | CANCELLED"
    }
  ]
}
Values for type, priority, and status MUST be exactly one of the enumerated strings. Do not output markdown code blocks.`;

    const { content } = await queryModelJSON({
      workspaceId,
      actorId: req.user.id,
      systemInstruction,
      prompt
    });

    const tasksToCreate = content.tasks || [];
    if (tasksToCreate.length === 0) {
      return res.status(200).json({ success: true, message: "AI did not generate any tasks.", tasks: [] });
    }

    // Get current max position
    const maxTask = await prisma.task.findFirst({
      where: { workspaceId, status: "TODO" },
      orderBy: { position: "desc" },
      select: { position: true }
    });
    let startingPos = maxTask ? maxTask.position : 0.0;

    const createdTasks = [];
    const logPromises = [];

    // Create tasks in a transaction or loop
    for (const t of tasksToCreate) {
      startingPos += 1000.0;
      const status = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED", "CANCELLED"].includes(t.status) ? t.status : "TODO";
      const priority = ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(t.priority) ? t.priority : "MEDIUM";
      const type = ["TASK", "BUG", "FEATURE", "EPIC", "STORY", "SUBTASK"].includes(t.type) ? t.type : "TASK";

      const task = await prisma.task.create({
        data: {
          workspaceId,
          title: t.title,
          description: t.description || "",
          status,
          priority,
          type,
          createdBy: req.user.id,
          position: startingPos
        }
      });

      createdTasks.push(task);

      logPromises.push(
        logTaskActivity({
          taskId: task.id,
          actorId: req.user.id,
          action: "CREATE",
          newValue: task.title
        })
      );
    }

    await Promise.all(logPromises);

    // Broadcast update
    if (req.io) {
      createdTasks.forEach(task => {
        req.io.to(`workspace:${workspaceId}`).emit("taskCreated", task);
      });
    }

    return res.status(201).json({ success: true, count: createdTasks.length, tasks: createdTasks });
  } catch (err) {
    console.error("[generateTasks]", err);
    return res.status(500).json({ success: false, message: "Failed to generate tasks using AI." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/ai/doc-generate
// ─────────────────────────────────────────────────────────────────────────────
export const generateDocument = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "prompt is required." });
    }

    const systemInstruction = `You are a technical writer assistant. Generate a structured document based on the user's prompt.
Your response MUST be valid JSON matching this schema:
{
  "title": "Document Title",
  "blocks": [
    {
      "type": "HEADING | PARAGRAPH | CODE | QUOTE | DIVIDER",
      "content": "Text content of the block (markdown syntax is allowed inside paragraphs/quotes)"
    }
  ]
}
Values for type MUST be exactly one of the enumerated strings. Do not output markdown code blocks.`;

    const { content } = await queryModelJSON({
      workspaceId,
      actorId: req.user.id,
      systemInstruction,
      prompt
    });

    const title = content.title || "AI Generated Page";
    const generatedBlocks = content.blocks || [];

    // Generate url slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const slug = `${baseSlug}-${random}`;

    // Create document
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        title,
        slug,
        createdBy: req.user.id,
        visibility: "WORKSPACE"
      }
    });

    // Create blocks in order
    const blocksData = generatedBlocks.map((b, idx) => ({
      documentId: doc.id,
      type: ["HEADING", "PARAGRAPH", "CODE", "QUOTE", "DIVIDER"].includes(b.type) ? b.type : "PARAGRAPH",
      content: b.content || "",
      position: (idx + 1) * 1000.0
    }));

    if (blocksData.length > 0) {
      await prisma.documentBlock.createMany({
        data: blocksData
      });
    }

    const finalDoc = await prisma.document.findUnique({
      where: { id: doc.id },
      include: { blocks: { orderBy: { position: "asc" } } }
    });

    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit("documentCreated", finalDoc);
    }

    return res.status(201).json({ success: true, document: finalDoc });
  } catch (err) {
    console.error("[generateDocument]", err);
    return res.status(500).json({ success: false, message: "Failed to generate document using AI." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents/:documentId/ai/summarize
// ─────────────────────────────────────────────────────────────────────────────
export const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { blocks: { orderBy: { position: "asc" } } }
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

    const textContent = doc.blocks
      .map(b => `${b.type}: ${b.content}`)
      .join("\n\n");

    if (!textContent.trim()) {
      return res.status(200).json({ success: true, summary: "Document is empty." });
    }

    const systemInstruction = "You are a summarizing assistant. Provide a concise, bulleted executive summary of the document text provided.";
    const prompt = `Please summarize the following document:\n\n${textContent}`;

    // Perform LLM query
    const { content } = await queryModel({
      workspaceId: doc.workspaceId,
      systemInstruction,
      prompt,
      useTools: false
    });

    // Log query cost
    try {
      // Find default settings or calculate cost
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(content.length / 4);
      const estimatedCostUsd = (promptTokens * 0.000000075) + (completionTokens * 0.00000030);

      await prisma.aIAuditLog.create({
        data: {
          workspaceId: doc.workspaceId,
          actorId: req.user.id,
          prompt: `Summarize doc: ${doc.title}`,
          agentType: "SUMMARIZATION",
          modelUsed: "gemini-2.5-flash",
          promptTokens,
          completionTokens,
          latencyMs: 1500,
          estimatedCostUsd
        }
      });
    } catch (auditErr) {
      console.error("[AICostLog] Failed to audit summarize:", auditErr);
    }

    return res.status(200).json({ success: true, summary: content });
  } catch (err) {
    console.error("[summarizeDocument]", err);
    return res.status(500).json({ success: false, message: "Failed to summarize document." });
  }
};
