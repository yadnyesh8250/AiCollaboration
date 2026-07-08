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

    // Update user status to ONLINE
    await prisma.user.update({
      where: { id: socket.user.id },
      data: { status: "ONLINE" }
    });

    // Broadcast presence to all workspaces the user is in
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: socket.user.id }
    });

    memberships.forEach(m => {
      io.to(`workspace:${m.workspaceId}`).emit("userOnline", { userId: socket.user.id });
    });

    // Events for joining rooms
    socket.on("joinWorkspace", (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      socketLogger.info({ userId: socket.user.id, workspaceId }, "User joined workspace room");
    });

    socket.on("leaveWorkspace", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on("joinChannel", (channelId) => {
      socket.join(`channel:${channelId}`);
      socketLogger.info({ userId: socket.user.id, channelId }, "User joined channel room");
    });

    socket.on("leaveChannel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Typing Indicators
    socket.on("typing", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("typing", { userId: socket.user.id, channelId });
    });

    socket.on("stopTyping", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("stopTyping", { userId: socket.user.id, channelId });
    });

    // Disconnect handling
    socket.on("disconnect", async () => {
      socketLogger.info({ userId: socket.user.id }, "User disconnected from WebSocket");
      
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { status: "OFFLINE", updatedAt: new Date() }
      });

      const memberOf = await prisma.workspaceMember.findMany({
        where: { userId: socket.user.id }
      });

      memberOf.forEach(m => {
        io.to(`workspace:${m.workspaceId}`).emit("userOffline", { userId: socket.user.id });
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
