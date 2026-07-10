import { create } from "zustand";

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type?: string;
  metadata?: any;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, "read" | "createdAt"> & { type?: string; metadata?: any }) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => {
      const newItem: NotificationItem = {
        ...notification,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newItem, ...state.notifications];
      return {
        notifications: updatedList,
        unreadCount: updatedList.filter((n) => !n.read).length,
      };
    }),
  markAsRead: (id) =>
    set((state) => {
      const updatedList = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updatedList,
        unreadCount: updatedList.filter((n) => !n.read).length,
      };
    }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
