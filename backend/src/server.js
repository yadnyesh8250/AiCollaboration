import "dotenv/config";
import { validateEnv } from "./config/env.js";
validateEnv();

import express from "express";
import cors from "cors";
import http from "http";
import { initSocket, closeSocket } from "./socket/index.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import aiFlatRoutes from "./routes/aiFlat.routes.js";

// Phase 5 imports
import { flatTaskRouter } from "./modules/task/task.routes.js";
import { generalSprintRouter } from "./modules/sprint/sprint.routes.js";
import { generalLabelRouter } from "./modules/label/label.routes.js";
import { flatDocumentRouter } from "./modules/document/document.routes.js";
import commentRouter from "./modules/comment/comment.routes.js";
import taskAttachmentRouter from "./modules/attachment/attachment.routes.js";
import searchRouter from "./modules/search/search.routes.js";

import { startBackgroundWorkers } from "./services/queue.service.js";
import path from "path";
import { logger, httpLogger, errorLogger } from "./utils/logger.js";
import { errorHandler } from "./middleware/error.middleware.js";
import helmet from "helmet";
import compression from "compression";
import healthRoutes from "./routes/health.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1); // Trust reverse proxy headers

// ── Middleware ──────────────────────────────────────────────────
app.use((req, res, next) => {
  httpLogger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Mount health routes at root
app.use("/", healthRoutes);

// Inject socket into req
app.use((req, res, next) => {
  req.io = app.get("io");
  next();
});

// ── Health check ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "A-Collab API is running 🚀" });
});

// Serve uploads statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/invites", invitationRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/ai", aiFlatRoutes);

// Phase 5 Routes
app.use("/api/tasks", flatTaskRouter);
app.use("/api", generalSprintRouter);
app.use("/api", generalLabelRouter);
app.use("/api/documents", flatDocumentRouter);
app.use("/api", commentRouter);
app.use("/api", taskAttachmentRouter);
app.use("/api/search", searchRouter);

// ── 404 handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────────
app.use(errorHandler);

const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);

server.listen(PORT, () => {
  logger.info(`✅ Server running on http://localhost:${PORT}`);
  startBackgroundWorkers();
});

// ── Graceful Shutdown Handler ──────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Set timeout to force exit if cleanup hangs
  const forceExitTimeout = setTimeout(() => {
    errorLogger.error("Graceful shutdown timed out. Force exiting.");
    process.exit(1);
  }, 10000);

  // 1. Close HTTP server
  server.close(async (err) => {
    if (err) {
      errorLogger.error({ err }, "Error closing Express server");
    } else {
      logger.info("Express HTTP server closed.");
    }

    // 2. Close Socket.io & Pub/Sub clients
    try {
      await closeSocket();
      logger.info("Socket.io connections closed.");
    } catch (e) {
      errorLogger.error({ err: e }, "Error closing Socket.io adapter");
    }

    // 3. Disconnect Redis
    try {
      const { redisClient } = await import("./config/redis.js");
      if (redisClient) {
        await redisClient.quit();
        logger.info("Main Redis connection quit.");
      }
    } catch (e) {
      errorLogger.error({ err: e }, "Error disconnecting Redis client");
    }

    // 4. Disconnect Prisma
    try {
      await prisma.$disconnect();
      logger.info("Prisma Client disconnected.");
    } catch (e) {
      errorLogger.error({ err: e }, "Error disconnecting Prisma Client");
    }

    clearTimeout(forceExitTimeout);
    logger.info("Graceful shutdown completed successfully. Exiting.");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
