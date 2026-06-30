import prisma from "../config/db.js";

/**
 * Send an in-app notification to a user.
 * 
 * @param {Object} params
 * @param {string} params.recipientId - ID of the user receiving the notification
 * @param {string} [params.actorId] - ID of the user triggering the notification
 * @param {string} params.type - e.g. "INVITE_RECEIVED", "ROLE_UPDATED"
 * @param {Object} [params.payload] - Extra JSON context for rendering
 */
export const sendNotification = async ({
  recipientId,
  actorId = null,
  type,
  payload = null,
}) => {
  try {
    await prisma.notification.create({
      data: {
        recipientId,
        actorId,
        type,
        payload,
      },
    });
  } catch (err) {
    console.error("[NotificationService] Failed to create notification:", err);
  }
};
