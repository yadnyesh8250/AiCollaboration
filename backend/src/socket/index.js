import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/db.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

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
    console.log(`[Socket] User connected: ${socket.user.id}`);

    // Update user status to ONLINE
    await prisma.user.update({
      where: { id: socket.user.id },
      data: { status: "ONLINE" }
    });

    // Broadcast presence to all workspaces the user is in (optimization needed for large scale, but fine for now)
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: socket.user.id },
      select: { workspaceId: true }
    });
    
    memberships.forEach(m => {
      io.to(`workspace:${m.workspaceId}`).emit("userOnline", { userId: socket.user.id });
    });

    // Events for joining rooms
    socket.on("joinWorkspace", (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`[Socket] User ${socket.user.id} joined workspace:${workspaceId}`);
    });

    socket.on("leaveWorkspace", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on("joinChannel", (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] User ${socket.user.id} joined channel:${channelId}`);
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
      console.log(`[Socket] User disconnected: ${socket.user.id}`);
      
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { status: "OFFLINE", updatedAt: new Date() } // Can use updatedAt as lastSeen
      });

      memberships.forEach(m => {
        io.to(`workspace:${m.workspaceId}`).emit("userOffline", { userId: socket.user.id });
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};
