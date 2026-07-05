import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/db.js";


// Note: Using the official `@google/generative-ai` SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Price definitions per token (Gemini 2.5 Flash as default reference)
const PRICING = {
  INPUT_COST_PER_TOKEN: 0.000000075, // $0.075 / 1M tokens
  OUTPUT_COST_PER_TOKEN: 0.00000030,  // $0.30 / 1M tokens
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
  const config = await prisma.workspaceAIConfig.findUnique({
    where: { workspaceId }
  });

  const modelName = config?.preferredModel || "gemini-2.5-flash";
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 2048;

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

  // Run generation
  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], ...options });
  const response = result.response;
  
  const latencyMs = Date.now() - startTime;
  const contentText = response.text() || "";
  
  // Count completion tokens
  const completionResult = await model.countTokens(contentText);
  const completionTokens = completionResult.totalTokens;

  // Cost calculation
  const estimatedCostUsd = (promptTokens * PRICING.INPUT_COST_PER_TOKEN) + 
                           (completionTokens * PRICING.OUTPUT_COST_PER_TOKEN);

  // Check if model returned function calls
  const functionCalls = response.functionCalls || [];

  return {
    content: contentText,
    promptTokens,
    completionTokens,
    latencyMs,
    estimatedCostUsd,
    modelUsed: modelName,
    functionCall: functionCalls.length > 0 ? functionCalls[0] : null
  };
};

/**
 * Streams token chunks back to a callback function for real-time WebSocket output.
 */
export const streamModel = async ({ workspaceId, systemInstruction, prompt, onChunk }) => {
  const config = await prisma.workspaceAIConfig.findUnique({
    where: { workspaceId }
  });

  const modelName = config?.preferredModel || "gemini-2.5-flash";
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 2048;

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

  const result = await model.generateContentStream({ contents: [{ role: "user", parts: [{ text: prompt }] }] });

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
