import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisConnection, isRedisAvailable } from "../config/redis.js";
import { socketLogger } from "../utils/logger.js";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/db.js";

let io;
let pubClient;
let subClient;

export const getIO = () => io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

  // Configure Redis Adapter for horizontal scaling if Redis is online
  if (isRedisAvailable) {
    try {
      pubClient = createRedisConnection();
      subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      socketLogger.info("⚡ [Socket] Redis Pub/Sub adapter registered.");
    } catch (err) {
      socketLogger.warn(`[Socket] Redis Adapter setup failed: ${err.message}. Falling back to default adapter.`);
    }
  }

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const decoded = verifyToken(token);
      socket.user = decoded; // { id, email, username }
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    socketLogger.info({ userId: socket.user.id }, "User connected via WebSocket");

    // 1. Initial Presence Registration
    try {
      // Clean up any stale presence records older than 5 minutes to prevent leak accumulation
      const staleTime = new Date(Date.now() - 5 * 60 * 1000);
      await prisma.presence.deleteMany({
        where: { lastSeen: { lt: staleTime } }
      });

      // Register or update presence record
      await prisma.presence.upsert({
        where: { socketId: socket.id },
        update: {
          userId: socket.user.id,
          status: "ONLINE",
          lastSeen: new Date(),
        },
        create: {
          socketId: socket.id,
          userId: socket.user.id,
          status: "ONLINE",
          lastSeen: new Date(),
        }
      });

      // Update user base status to ONLINE
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { status: "ONLINE" }
      });
    } catch (presenceErr) {
      socketLogger.error({ err: presenceErr }, "Failed to upsert presence record");
    }

    // Join User Specific Room for direct messages/notifications
    socket.join(`user:${socket.user.id}`);

    // Broadcast presence to all workspaces the user is in
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: socket.user.id }
    });

    memberships.forEach(m => {
      io.to(`workspace:${m.workspaceId}`).emit("userOnline", { userId: socket.user.id });
    });

    // 2. Presence & Page Navigation Listeners
    socket.on("joinWorkspace", async (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      socketLogger.info({ userId: socket.user.id, workspaceId }, "User joined workspace room");

      try {
        await prisma.presence.updateMany({
          where: { socketId: socket.id },
          data: {
            workspaceId,
            currentPage: "Dashboard",
            lastSeen: new Date()
          }
        });

        // Broadcast user join event
        io.to(`workspace:${workspaceId}`).emit("user:join", {
          userId: socket.user.id,
          workspaceId,
          currentPage: "Dashboard"
        });
      } catch (err) {
        socketLogger.error({ err }, "Error updating workspace join presence");
      }
    });

    socket.on("leaveWorkspace", async (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      try {
        await prisma.presence.updateMany({
          where: { socketId: socket.id },
          data: {
            workspaceId: null,
            currentPage: null,
            currentChannel: null,
            lastSeen: new Date()
          }
        });

        io.to(`workspace:${workspaceId}`).emit("user:leave", { userId: socket.user.id, workspaceId });
      } catch (err) {
        socketLogger.error({ err }, "Error updating workspace leave presence");
      }
    });

    socket.on("page:change", async ({ workspaceId, page, channelId }) => {
      try {
        await prisma.presence.updateMany({
          where: { socketId: socket.id },
          data: {
            workspaceId,
            currentPage: page,
            currentChannel: channelId || null,
            lastSeen: new Date()
          }
        });

        // Broadcast status update
        io.to(`workspace:${workspaceId}`).emit("presence:update", {
          userId: socket.user.id,
          workspaceId,
          currentPage: page,
          currentChannel: channelId || null,
          status: "ONLINE"
        });
      } catch (err) {
        socketLogger.error({ err }, "Error updating page change presence");
      }
    });

    socket.on("joinChannel", (channelId) => {
      socket.join(`channel:${channelId}`);
      socketLogger.info({ userId: socket.user.id, channelId }, "User joined channel room");
    });

    socket.on("leaveChannel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // 3. Collaborative Cursors (Cursor Sync)
    socket.on("document:join", ({ documentId }) => {
      socket.join(`document:${documentId}`);
      socketLogger.info({ userId: socket.user.id, documentId }, "User joined collaborative doc room");
    });

    socket.on("document:leave", ({ documentId }) => {
      socket.leave(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit("cursor:leave", { userId: socket.user.id });
    });

    socket.on("cursor:move", ({ documentId, x, y }) => {
      socket.to(`document:${documentId}`).emit("cursor:move", {
        userId: socket.user.id,
        username: socket.user.username,
        x,
        y
      });
    });

    socket.on("cursor:leave", ({ documentId }) => {
      socket.to(`document:${documentId}`).emit("cursor:leave", { userId: socket.user.id });
    });

    // 4. Typing Indicators
    socket.on("typing", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("typing", { userId: socket.user.id, channelId });
    });

    socket.on("stopTyping", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("stopTyping", { userId: socket.user.id, channelId });
    });

    // Disconnect handling
    socket.on("disconnect", async () => {
      socketLogger.info({ userId: socket.user.id }, "User disconnected from WebSocket");
      
      try {
        // Clean up DB presence session
        await prisma.presence.deleteMany({
          where: { socketId: socket.id }
        });

        // Check if there are other active sessions for this user
        const activeSessions = await prisma.presence.count({
          where: { userId: socket.user.id }
        });

        if (activeSessions === 0) {
          await prisma.user.update({
            where: { id: socket.user.id },
            data: { status: "OFFLINE", updatedAt: new Date() }
          });
        }
      } catch (presenceErr) {
        socketLogger.error({ err: presenceErr }, "Error cleaning up disconnect presence");
      }

      const memberOf = await prisma.workspaceMember.findMany({
        where: { userId: socket.user.id }
      });

      memberOf.forEach(m => {
        io.to(`workspace:${m.workspaceId}`).emit("userOffline", { userId: socket.user.id });
        io.to(`workspace:${m.workspaceId}`).emit("user:leave", { userId: socket.user.id, workspaceId: m.workspaceId });
      });
    });
  });

  return io;
};

/**
 * Cleanup function to safely shutdown the Socket.io server and release Redis connections
 */
export const closeSocket = async () => {
  if (io) {
    io.close();
  }
  if (pubClient) {
    await pubClient.quit();
  }
  if (subClient) {
    await subClient.quit();
  }
};
