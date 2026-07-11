import { create } from "zustand";

export const useUIStore = create((set) => ({
  isSidebarCollapsed: false,
  activeRightPanel: null,
  activeThreadParentId: null,
  isCommandPaletteOpen: false,
  activeWorkspaceId: null,
  activeOrgId: null,
  activeChannelId: null,

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setRightPanel: (panel) => set({ activeRightPanel: panel }),
  setThreadParent: (messageId) => set({ activeThreadParentId: messageId }),
  setCommandPalette: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
  setContext: (orgId, workspaceId, channelId = null) =>
    set({ activeOrgId: orgId, activeWorkspaceId: workspaceId, activeChannelId: channelId }),
}));
