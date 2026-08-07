import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import prisma from "../config/db.js";
import { parseLLMJSON } from "../utils/json.js";
import { aiLogger } from "../utils/logger.js";
import { redisClient, isRedisAvailable } from "../config/redis.js";

// Note: Using the official `@google/generative-ai` SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Price definitions per token (Gemini 2.5 Flash as default reference)
const PRICING = {
  INPUT_COST_PER_TOKEN: 0.000000075, // $0.075 / 1M tokens
  OUTPUT_COST_PER_TOKEN: 0.00000030,  // $0.30 / 1M tokens
};

/**
 * Exponential Backoff Retry wrapper for transient Gemini API errors (e.g. 503, 429)
 */
const makeModelRequestWithRetries = async (fn, maxRetries = 3, initialDelay = 1500) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err.status || (err.response && err.response.status);
      const isTransient = status === 503 || status === 429 || 
                          err.message.includes("high demand") || 
                          err.message.includes("Service Unavailable") ||
                          err.message.includes("temporary");
      
      if (isTransient && attempt < maxRetries) {
        const delayMs = initialDelay * Math.pow(2, attempt);
        aiLogger.warn({ status, attempt, maxRetries, delayMs }, "Gemini API transient error, retrying");
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
};

/**
 * Declares the standard set of tools (Function Calling) available to the AI.
 */
export const getAITools = () => {
  return [
    {
      name: "createTask",
      description: "Create a task in the workspace backlog.",
      parameters: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "The direct title of the task" },
          assigneeUsername: { type: "STRING", description: "The username of the assignee (optional)" },
          description: { type: "STRING", description: "Task notes/details (optional)" }
        },
        required: ["title"]
      }
    },
    {
      name: "createChannel",
      description: "Create a communication channel inside the workspace.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Display name of the channel" },
          description: { type: "STRING", description: "Purpose of the channel (optional)" },
          type: { type: "STRING", enum: ["PUBLIC", "PRIVATE"], description: "Whether the channel is public or private" }
        },
        required: ["name"]
      }
    },
    {
      name: "searchMessages",
      description: "Search workspace channel messages using keyword full-text matching.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Keyword string to search for" }
        },
        required: ["query"]
      }
    }
  ];
};

/**
 * Interface to communicate with Google Gemini.
 */
export const queryModel = async ({ workspaceId, systemInstruction, prompt, useTools = false }) => {
  // Generate Cache Key
  const cacheKeyStr = `${systemInstruction || ""}:${prompt}:${useTools}`;
  const hash = crypto.createHash("sha256").update(cacheKeyStr).digest("hex");
  const cacheKey = `ai:cache:${workspaceId || "global"}:${hash}`;

  // Read AI Cache
  if (isRedisAvailable && redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        aiLogger.info({ workspaceId, cacheKey }, "AI Cache Hit in Redis");
        return JSON.parse(cached);
      }
    } catch (err) {
      aiLogger.warn({ err }, "Failed to read AI Cache from Redis");
    }
  }

  const config = await prisma.workspaceAIConfig.findUnique({
    where: { workspaceId }
  });

  let modelName = config?.preferredModel || "gemini-flash-latest";
  if (modelName === "gemini-2.5-flash") {
    modelName = "gemini-flash-latest";
  }
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 4096;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  });

  const startTime = Date.now();

  const options = {};
  if (useTools) {
    options.tools = [{ functionDeclarations: getAITools() }];
  }

  // Count prompt tokens
  const countResult = await model.countTokens(prompt);
  const promptTokens = countResult.totalTokens;

  // Run generation with retries
  const result = await makeModelRequestWithRetries(() => 
    model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], ...options })
  );
  const response = result.response;
  
  const latencyMs = Date.now() - startTime;
  let contentText = "";
  try {
    contentText = response.text() || "";
  } catch (textErr) {
    aiLogger.info("Response has no text content (likely a function call request)");
  }
  
  // Count completion tokens
  const completionResult = await model.countTokens(contentText);
  const completionTokens = completionResult.totalTokens;

  // Cost calculation
  const estimatedCostUsd = (promptTokens * PRICING.INPUT_COST_PER_TOKEN) + 
                           (completionTokens * PRICING.OUTPUT_COST_PER_TOKEN);

  // Check if model returned function calls (supporting both method and array properties in SDK versions)
  const functionCalls = (typeof response.functionCalls === "function" 
    ? response.functionCalls() 
    : response.functionCalls) || [];

  const resultData = {
    content: contentText,
    promptTokens,
    completionTokens,
    latencyMs,
    estimatedCostUsd,
    modelUsed: modelName,
    functionCall: functionCalls.length > 0 ? functionCalls[0] : null
  };

  // Save in Redis AI Cache (1 hour expiration)
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(resultData), "EX", 3600);
      aiLogger.info({ workspaceId, cacheKey }, "AI response saved to Redis Cache");
    } catch (err) {
      aiLogger.warn({ err }, "Failed to write AI response to Redis Cache");
    }
  }

  return resultData;
};

/**
 * Streams token chunks back to a callback function for real-time WebSocket output.
 */
export const streamModel = async ({ workspaceId, systemInstruction, prompt, onChunk }) => {
  const config = await prisma.workspaceAIConfig.findUnique({
    where: { workspaceId }
  });

  let modelName = config?.preferredModel || "gemini-flash-latest";
  if (modelName === "gemini-2.5-flash") {
    modelName = "gemini-flash-latest";
  }
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 4096;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  });

  const startTime = Date.now();

  // Count prompt tokens
  const countResult = await model.countTokens(prompt);
  const promptTokens = countResult.totalTokens;

  // Run stream generation with retries
  const result = await makeModelRequestWithRetries(() =>
    model.generateContentStream({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  );

  let fullText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onChunk) onChunk(chunkText);
  }

  const latencyMs = Date.now() - startTime;

  // Count completion tokens
  const completionResult = await model.countTokens(fullText);
  const completionTokens = completionResult.totalTokens;

  const estimatedCostUsd = (promptTokens * PRICING.INPUT_COST_PER_TOKEN) + 
                           (completionTokens * PRICING.OUTPUT_COST_PER_TOKEN);

  return {
    content: fullText,
    promptTokens,
    completionTokens,
    latencyMs,
    estimatedCostUsd,
    modelUsed: modelName
  };
};

/**
 * Interface to request structured JSON output from Google Gemini.
 */
export const queryModelJSON = async ({ workspaceId, actorId, systemInstruction, prompt, responseSchema = null }) => {
  const config = await prisma.workspaceAIConfig.findUnique({
    where: { workspaceId }
  });

  let modelName = config?.preferredModel || "gemini-flash-latest";
  if (modelName === "gemini-2.5-flash") {
    modelName = "gemini-flash-latest";
  }
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 4096;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      ...(responseSchema && { responseSchema })
    }
  });

  const startTime = Date.now();

  // Count prompt tokens
  const countResult = await model.countTokens(prompt);
  const promptTokens = countResult.totalTokens;

  // Run generation with retries
  const result = await makeModelRequestWithRetries(() =>
    model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  );
  const response = result.response;
  
  const latencyMs = Date.now() - startTime;
  const contentText = response.text() || "{}";
  
  // Count completion tokens
  const completionResult = await model.countTokens(contentText);
  const completionTokens = completionResult.totalTokens;

  // Cost calculation
  const estimatedCostUsd = (promptTokens * PRICING.INPUT_COST_PER_TOKEN) + 
                           (completionTokens * PRICING.OUTPUT_COST_PER_TOKEN);

  // Log AI Cost Metrics to Audit Logs
  try {
    await prisma.aIAuditLog.create({
      data: {
        workspaceId,
        actorId,
        prompt: prompt.substring(0, 500),
        agentType: "PRODUCTIVITY",
        modelUsed: modelName,
        promptTokens,
        completionTokens,
        latencyMs,
        estimatedCostUsd
      }
    });
  } catch (err) {
    aiLogger.error({ err }, "Failed to audit AI cost log");
  }

  return {
    content: parseLLMJSON(contentText),
    promptTokens,
    completionTokens,
    latencyMs,
    estimatedCostUsd
  };
};
