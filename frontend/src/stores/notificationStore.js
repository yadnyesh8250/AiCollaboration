import { create } from "zustand";

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => {
      const newItem = {
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
