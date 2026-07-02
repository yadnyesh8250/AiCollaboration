import prisma from "../config/db.js";
import { sendNotification } from "./notification.service.js";

/**
 * Extracts @username mentions from text, inserts into DB, and sends notifications.
 * @param {string} content The message content
 * @param {string} messageId The ID of the message
 * @param {string} senderId The user ID of the sender
 */
export const processMentions = async (content, messageId, senderId) => {
  if (!content) return;

  // Regex to find @username
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = [...content.matchAll(mentionRegex)];
  
  if (matches.length === 0) return;

  // Extract unique usernames
  const usernames = [...new Set(matches.map(m => m[1]))];

  // Find users in DB
  const mentionedUsers = await prisma.user.findMany({
    where: {
      username: { in: usernames }
    }
  });

  if (mentionedUsers.length === 0) return;

  // Prepare batch insert for Mentions
  const mentionData = mentionedUsers.map(u => ({
    messageId,
    mentionedUserId: u.id
  }));

  await prisma.mention.createMany({
    data: mentionData,
    skipDuplicates: true
  });

  // Create notifications
  for (const user of mentionedUsers) {
    if (user.id === senderId) continue; // Don't notify self

    await sendNotification({
      recipientId: user.id,
      actorId: senderId,
      type: "MENTION",
      payload: { messageId }
    });
  }
};
