import prisma from "../config/db.js";
import { getIO } from "../socket/index.js";

/**
 * Creates and dispatches a notification to a specific recipient user.
 * Writes to the database and broadcasts in real-time via Socket.io.
 */
export const sendNotification = async ({ recipientId, actorId, type, payload }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId,
        actorId: actorId || null,
        type,
        payload: payload || {},
        isRead: false,
      },
    });

    // Broadcast to user socket room
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit("notification:new", notification);
    }

    return notification;
  } catch (err) {
    console.error("[sendNotification] Failed to create notification:", err);
    throw err;
  }
};

export const dispatchNotification = sendNotification;
