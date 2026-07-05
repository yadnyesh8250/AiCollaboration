import crypto from "crypto";
import prisma from "../config/db.js";
import { queryModel } from "../services/llm.service.js";
import { buildRAGContext } from "../services/context.service.js";
import { executeTool } from "../services/action.service.js";
import { queueJob } from "../services/queue.service.js";

// Helper to compute query SHA256 hash for cache matching
const computeQueryHash = (prompt, contextString) => {
  return crypto.createHash("sha256").update(prompt + contextString).digest("hex");
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/ai/conversations
// Create AI Conversation Tree
// ─────────────────────────────────────────────────────────────────────────────
export const createConversation = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title = "New AI Conversation" } = req.body;

    const conversation = await prisma.aIConversation.create({
      data: {
        workspaceId,
        createdBy: req.user.id,
        title
      }
    });

    // Auto-create workspace config and persona if they don't exist
    await prisma.workspaceAIConfig.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId }
    });

    await prisma.workspaceAIPersona.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId }
    });

    return res.status(201).json({ success: true, conversation });
  } catch (err) {
    console.error("[createConversation]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/conversations/:conversationId/messages
// Send User Prompt (Checks cache, builds context, runs LLM, audits, streams)
// ─────────────────────────────────────────────────────────────────────────────
export const sendPrompt = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { prompt, parentId } = req.body;

    if (!prompt) return res.status(400).json({ success: false, message: "Prompt is required." });

    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId }
    });
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });

    const workspaceId = conversation.workspaceId;

    // 1. Compile System Instructions incorporating Custom Persona Tone
    const persona = await prisma.workspaceAIPersona.findUnique({ where: { workspaceId } });
    const config = await prisma.workspaceAIConfig.findUnique({ where: { workspaceId } });
    
    const botName = persona?.name || "CollabBot";
    const tone = persona?.behavior || "HELPFUL";
    
    let personaPrompt = `You are ${botName}, a workspace assistant. Your tone is: ${tone}.\n`;
    if (config?.baseSystemPrompt) {
      personaPrompt += `${config.baseSystemPrompt}\n`;
    }

    // 2. Build RAG Context & Rank
    const context = await buildRAGContext({ workspaceId, query: prompt });
    const fullSystemInstruction = `${personaPrompt}\nUse the following workspace context if relevant to the user query:\n${context}`;

    // 3. Cache Check
    const queryHash = computeQueryHash(prompt, context);
    const cachedResponse = await prisma.aICache.findFirst({
      where: {
        workspaceId,
        queryHash,
        expiresAt: { gte: new Date() }
      }
    });

    // Save User message
    const userMsg = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: prompt,
        parentId
      }
    });

    if (cachedResponse) {
      console.log("[AICache] Cache Hit!");
      
      const assistantMsg = await prisma.aIMessage.create({
        data: {
          conversationId,
          role: "ASSISTANT",
          content: cachedResponse.responseText,
          parentId: userMsg.id
        }
      });

      return res.status(200).json({
        success: true,
        userMessage: userMsg,
        aiResponse: assistantMsg,
        cached: true
      });
    }

    // 4. Query LLM via Gateway (using tools/function calling)
    const llmResponse = await queryModel({
      workspaceId,
      systemInstruction: fullSystemInstruction,
      prompt,
      useTools: true
    });

    let finalContent = llmResponse.content;
    let toolResultLog = null;
    let toolName = null;

    // 5. Tool Registry Execution (if tool_call is returned)
    if (llmResponse.functionCall) {
      toolName = llmResponse.functionCall.name;
      const args = llmResponse.functionCall.args;
      
      try {
        const toolOutput = await executeTool({
          workspaceId,
          actorId: req.user.id,
          toolName,
          args
        });

        toolResultLog = JSON.stringify(toolOutput);
        
        // Re-call LLM to write confirmation text using tool results
        const toolConfirmation = await queryModel({
          workspaceId,
          systemInstruction: fullSystemInstruction,
          prompt: `User Prompt: ${prompt}\nExecuted Tool: ${toolName}\nTool Output: ${toolResultLog}\nWrite a brief, friendly confirmation message to the user outlining what was done.`,
          useTools: false
        });

        finalContent = toolConfirmation.content;
      } catch (toolErr) {
        finalContent = `I attempted to run the tool '${toolName}' but it failed: ${toolErr.message}`;
        toolResultLog = `Error: ${toolErr.message}`;
      }
    }

    // Save Assistant message
    const assistantMsg = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: finalContent,
        parentId: userMsg.id
      }
    });

    // 6. Write to Cache (expires in 5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await prisma.aICache.upsert({
      where: {
        workspaceId_queryHash: {
          workspaceId,
          queryHash
        }
      },
      update: {
        responseText: finalContent,
        expiresAt
      },
      create: {
        workspaceId,
        queryHash,
        responseText: finalContent,
        expiresAt
      }
    });

    // 7. Log AI Cost Metrics to Audit Logs
    await prisma.aIAuditLog.create({
      data: {
        workspaceId,
        actorId: req.user.id,
        prompt,
        agentType: toolName ? "TOOL_EXECUTOR" : "GENERAL_ASSISTANT",
        toolUsed: toolName,
        toolResult: toolResultLog,
        modelUsed: llmResponse.modelUsed,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        latencyMs: llmResponse.latencyMs,
        estimatedCostUsd: llmResponse.estimatedCostUsd
      }
    });

    return res.status(200).json({
      success: true,
      userMessage: userMsg,
      aiResponse: assistantMsg,
      cached: false,
      toolExecuted: toolName
    });
  } catch (err) {
    console.error("[sendPrompt]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/ai/conversations
// List Conversations
// ─────────────────────────────────────────────────────────────────────────────
export const listConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const conversations = await prisma.aIConversation.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' }
    });
    return res.status(200).json({ success: true, conversations });
  } catch (err) {
    console.error("[listConversations]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/ai/knowledge
// Add to Knowledge Base
// ─────────────────────────────────────────────────────────────────────────────
export const addKnowledge = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { category, title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "title and content are required." });
    }

    const knowledge = await prisma.workspaceKnowledge.create({
      data: {
        workspaceId,
        category: category || "FAQ",
        title,
        content
      }
    });

    return res.status(201).json({ success: true, knowledge });
  } catch (err) {
    console.error("[addKnowledge]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/ai/knowledge
// List Knowledge Base
// ─────────────────────────────────────────────────────────────────────────────
export const listKnowledge = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const knowledge = await prisma.workspaceKnowledge.findMany({
      where: { workspaceId }
    });
    return res.status(200).json({ success: true, knowledge });
  } catch (err) {
    console.error("[listKnowledge]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/ai/permissions
// Update Tool Permissions
// ─────────────────────────────────────────────────────────────────────────────
export const updatePermissions = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { permissions } = req.body; // array: [{ toolName, isAllowed }]

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: "permissions must be an array." });
    }

    for (const perm of permissions) {
      await prisma.aIPermission.upsert({
        where: {
          workspaceId_toolName: {
            workspaceId,
            toolName: perm.toolName
          }
        },
        update: { isAllowed: perm.isAllowed },
        create: {
          workspaceId,
          toolName: perm.toolName,
          isAllowed: perm.isAllowed
        }
      });
    }

    return res.status(200).json({ success: true, message: "AI Tool permissions updated successfully." });
  } catch (err) {
    console.error("[updatePermissions]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/ai/config
// Update Workspace Config
// ─────────────────────────────────────────────────────────────────────────────
export const updateAIConfig = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { preferredModel, temperature, maxTokens, baseSystemPrompt } = req.body;

    const config = await prisma.workspaceAIConfig.upsert({
      where: { workspaceId },
      update: {
        ...(preferredModel && { preferredModel }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens && { maxTokens }),
        ...(baseSystemPrompt !== undefined && { baseSystemPrompt })
      },
      create: {
        workspaceId,
        preferredModel: preferredModel || "gemini-2.5-flash",
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2048,
        baseSystemPrompt
      }
    });

    return res.status(200).json({ success: true, config });
  } catch (err) {
    console.error("[updateAIConfig]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/ai/persona
// Update Assistant Persona
// ─────────────────────────────────────────────────────────────────────────────
export const updateAIPersona = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, behavior } = req.body;

    const persona = await prisma.workspaceAIPersona.upsert({
      where: { workspaceId },
      update: {
        ...(name && { name }),
        ...(behavior && { behavior })
      },
      create: {
        workspaceId,
        name: name || "CollabBot",
        behavior: behavior || "HELPFUL"
      }
    });

    return res.status(200).json({ success: true, persona });
  } catch (err) {
    console.error("[updateAIPersona]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/ai/analytics
// AI Cost & Latency Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const logs = await prisma.aIAuditLog.findMany({
      where: { workspaceId }
    });

    const totalSpend = logs.reduce((sum, log) => sum + Number(log.estimatedCostUsd), 0);
    const totalTokens = logs.reduce((sum, log) => sum + log.promptTokens + log.completionTokens, 0);
    const avgLatency = logs.length > 0 ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalSpendUsd: Number(totalSpend.toFixed(6)),
        totalTokensUsed: totalTokens,
        averageLatencyMs: Math.round(avgLatency),
        totalRequests: logs.length
      }
    });
  } catch (err) {
    console.error("[getAnalytics]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/ai/jobs
// Queue Background Worker Job Manual Request
// ─────────────────────────────────────────────────────────────────────────────
export const queueJobRequest = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { jobType } = req.body;

    if (!jobType) return res.status(400).json({ success: false, message: "jobType is required." });

    const job = await queueJob({
      workspaceId,
      jobType,
      payload: { requestedBy: req.user.id }
    });

    return res.status(202).json({ success: true, message: "AI summary job queued successfully.", job });
  } catch (err) {
    console.error("[queueJobRequest]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
