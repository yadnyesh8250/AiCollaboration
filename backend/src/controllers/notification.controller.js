import prisma from "../config/db.js";

// GET /api/notifications
export const listNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json({ success: true, notifications });
  } catch (err) {
    console.error("[listNotifications]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    console.error("[markRead]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("[markAllRead]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await prisma.notification.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Notification deleted successfully." });
  } catch (err) {
    console.error("[deleteNotification]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
