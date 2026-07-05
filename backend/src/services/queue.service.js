import cron from "node-cron";
import prisma from "../config/db.js";
import { queryModel } from "./llm.service.js";

/**
 * AI Job Queue Processor
 */
export const startBackgroundWorkers = () => {
  console.log("🚀 [AIWorker] Background workers initialized.");

  // Daily Summary Cron: Every day at 9:00 AM (0 9 * * *)
  // For development testing we can also trigger it on a shorter interval, but let's stick to spec.
  cron.schedule("0 9 * * *", async () => {
    console.log("[AIWorker] Triggering Daily Summary Cron job...");
    const workspaces = await prisma.workspace.findMany();
    
    for (const ws of workspaces) {
      await queueJob({
        workspaceId: ws.id,
        jobType: "DAILY_SUMMARY",
        payload: { workspaceName: ws.name }
      });
    }
  });

  // Start checking/processing pending jobs in the queue every 30 seconds
  setInterval(async () => {
    await processNextQueueJob();
  }, 30000);
};

/**
 * Queue a new job in the database.
 */
export const queueJob = async ({ workspaceId, jobType, payload }) => {
  return await prisma.aIJob.create({
    data: {
      workspaceId,
      jobType,
      payload,
      status: "PENDING",
      runAt: new Date()
    }
  });
};

/**
 * Polls and runs the next pending job in the queue.
 */
const processNextQueueJob = async () => {
  const job = await prisma.aIJob.findFirst({
    where: {
      status: "PENDING",
      runAt: { lte: new Date() }
    }
  });

  if (!job) return;

  // Optimistic lock: update status to PROCESSING
  await prisma.aIJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING" }
  });

  console.log(`[AIWorker] Processing job ${job.id} (${job.jobType})...`);

  try {
    let resultText = "";

    if (job.jobType === "DAILY_SUMMARY") {
      // 1. Gather all messages sent in the workspace in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const messages = await prisma.message.findMany({
        where: {
          channel: { workspaceId: job.workspaceId },
          createdAt: { gte: yesterday },
          deletedAt: null
        },
        include: { sender: { select: { username: true } }, channel: { select: { name: true } } }
      });

      if (messages.length === 0) {
        resultText = "No active conversations in the last 24 hours to summarize.";
      } else {
        const textLog = messages.map(m => `[#${m.channel.name}] @${m.sender.username}: "${m.content}"`).join("\n");
        const prompt = `Please summarize yesterday's channel conversations in the workspace. Here is the discussion log:\n\n${textLog}`;

        const aiResponse = await queryModel({
          workspaceId: job.workspaceId,
          systemInstruction: "You are an automated cron summary writer. Write a concise, bulleted daily summary of workspace progress.",
          prompt,
          useTools: false
        });

        resultText = aiResponse.content;

        // Save summary to Knowledge Base
        await prisma.workspaceKnowledge.create({
          data: {
            workspaceId: job.workspaceId,
            category: "SPRINT_GOALS",
            title: `Daily Summary - ${new Date().toLocaleDateString()}`,
            content: resultText
          }
        });
      }
    }

    // Mark job completed
    await prisma.aIJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", result: resultText }
    });

    console.log(`[AIWorker] Job ${job.id} completed successfully.`);
  } catch (err) {
    console.error(`[AIWorker] Job ${job.id} failed:`, err);
    await prisma.aIJob.update({
      where: { id: job.id },
      data: { status: "FAILED", result: err.message }
    });
  }
};
