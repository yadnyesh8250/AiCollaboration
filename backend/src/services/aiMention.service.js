import crypto from "crypto";
import prisma from "../config/db.js";
import { streamModel } from "./llm.service.js";
import { buildRAGContext } from "./context.service.js";
import { getIO } from "../socket/index.js";

/**
 * Handles real-time mentions of AI Agents (@ai, @task, @docs) in channels
 */
export const handleAIMention = async ({ content, channelId, senderId, messageId }) => {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId }
  });
  if (!channel) return;

  const workspaceId = channel.workspaceId;

  // Determine agent type based on tag
  let agentType = "GENERAL";
  let botName = "CollabBot";
  let behavior = "HELPFUL";

  if (content.includes("@task")) {
    agentType = "TASK";
    botName = "TaskBot";
    behavior = "STRICT";
  } else if (content.includes("@docs")) {
    agentType = "DOCS";
    botName = "DocBot";
    behavior = "TECHNICAL";
  }

  // Load custom workspace persona if exists
  const persona = await prisma.workspaceAIPersona.findUnique({ where: { workspaceId } });
  const config = await prisma.workspaceAIConfig.findUnique({ where: { workspaceId } });

  const finalBotName = persona?.name || botName;
  const finalBehavior = persona?.behavior || behavior;

  let systemInstruction = `You are ${finalBotName}, a specialized AI Agent of type ${agentType}. Your behavior archetype is: ${finalBehavior}.\n`;
  if (config?.baseSystemPrompt) {
    systemInstruction += `${config.baseSystemPrompt}\n`;
  }

  // Build RAG ranked context
  const cleanPrompt = content.replace(/@(ai|task|docs)/g, "").trim();
  const context = await buildRAGContext({ workspaceId, channelId, query: cleanPrompt });
  const fullSystemInstruction = `${systemInstruction}\nUse this workspace context:\n${context}`;

  // Emit typing indicator
  const io = getIO();
  io.to(`channel:${channelId}`).emit("typing", { userId: "ai", channelId });

  // Generate an ID for the assistant response message beforehand
  const assistantMessageId = crypto.randomUUID();

  try {
    let fullResponseText = "";

    // Stream model chunks
    const llmMetrics = await streamModel({
      workspaceId,
      systemInstruction: fullSystemInstruction,
      prompt: cleanPrompt,
      onChunk: (chunk) => {
        fullResponseText += chunk;
        io.to(`channel:${channelId}`).emit("aiMessageChunk", {
          channelId,
          messageId: assistantMessageId,
          chunk
        });
      }
    });

    io.to(`channel:${channelId}`).emit("stopTyping", { userId: "ai", channelId });

    // Save final message to DB
    const finalMessage = await prisma.message.create({
      data: {
        id: assistantMessageId,
        channelId,
        senderId: senderId, // Associated under sender's session, but let's make it system sender or flag as AI
        content: fullResponseText,
        messageType: "AI"
      }
    });

    io.to(`channel:${channelId}`).emit("aiMessageComplete", {
      channelId,
      messageId: assistantMessageId,
      fullContent: fullResponseText
    });

    // Write AIAuditLog
    await prisma.aIAuditLog.create({
      data: {
        workspaceId,
        actorId: senderId,
        prompt: cleanPrompt,
        agentType: `${agentType}_AGENT`,
        modelUsed: llmMetrics.modelUsed,
        promptTokens: llmMetrics.promptTokens,
        completionTokens: llmMetrics.completionTokens,
        latencyMs: llmMetrics.latencyMs,
        estimatedCostUsd: llmMetrics.estimatedCostUsd
      }
    });

  } catch (err) {
    console.error("[handleAIMention] Failed to stream AI content:", err);
    io.to(`channel:${channelId}`).emit("stopTyping", { userId: "ai", channelId });
    io.to(`channel:${channelId}`).emit("aiMessageComplete", {
      channelId,
      messageId: assistantMessageId,
      fullContent: `I encountered an error trying to process your request: ${err.message}`
    });
  }
};
