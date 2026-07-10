import { create } from "zustand";

interface UIState {
  isSidebarCollapsed: boolean;
  activeRightPanel: "THREAD" | "AI" | null;
  activeThreadParentMessageId: string | null;
  isCommandPaletteOpen: boolean;
  activeWorkspaceId: string | null;
  activeOrgId: string | null;
  activeChannelId: string | null;
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanel: (panel: "THREAD" | "AI" | null) => void;
  setThreadParent: (messageId: string | null) => void;
  setCommandPalette: (isOpen: boolean) => void;
  setContext: (orgId: string | null, workspaceId: string | null, channelId?: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  activeRightPanel: null,
  activeThreadParentMessageId: null,
  isCommandPaletteOpen: false,
  activeWorkspaceId: null,
  activeOrgId: null,
  activeChannelId: null,

  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setRightPanel: (panel) => set({ activeRightPanel: panel }),
  setThreadParent: (messageId) => set({ activeThreadParentMessageId: messageId }),
  setCommandPalette: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
  setContext: (orgId, workspaceId, channelId = null) =>
    set({ activeOrgId: orgId, activeWorkspaceId: workspaceId, activeChannelId: channelId }),
}));
