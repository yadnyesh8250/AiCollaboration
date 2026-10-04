import React, { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";

const routeLabels = {
  "": "Home",
  "tasks": "My Tasks",
  "chat": "Channels",
  "docs": "Documents",
  "settings": "Settings",
};

/* ══════════════════════════════════════════════════════
   A-Collab Topbar — Stitch Workspace OS Design
   ══════════════════════════════════════════════════════ */
export default function Topbar() {
  const { toggleSidebar, setCommandPalette, setRightPanel, activeRightPanel } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentSection = pathSegments.length > 2 ? pathSegments[pathSegments.length - 1] : "";
  const sectionLabel = routeLabels[currentSection] ?? "Workspace";

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then(res => res.data.workspace),
    enabled: !!workspaceId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then(res => res.data.notifications || []),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handle = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
    socket.on("notification:new", handle);
    return () => socket.off("notification:new", handle);
  }, [queryClient]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isAIOpen = activeRightPanel === "AI_COPILOT";

  return (
    <header className="h-14 w-full shrink-0 bg-surface-ws/90 backdrop-blur-md border-b border-border/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-20 flex items-center justify-between px-space-lg">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-space-md">
        <button onClick={toggleSidebar} className="lg:hidden p-1.5 -ml-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="Toggle sidebar"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span></button>
        <div className="flex items-center gap-space-xs text-on-surface-variant text-body-sm">
          <span className="hover:text-on-surface cursor-pointer" onClick={() => window.history.back()}>Workspace</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          <span className="text-on-surface font-medium">{workspace?.name || "A-Collab Development"}</span>
          {sectionLabel !== "Home" && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
              <span className="text-on-surface">{sectionLabel}</span>
            </>
          )}
        </div>
        {/* Status badge */}
        <div className="hidden md:flex items-center gap-space-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-label-sm">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#006c49' }} />
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}>Operational</span>
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-space-md">
        {/* Search trigger */}
        <button
          onClick={() => setCommandPalette(true)}
          className="flex items-center gap-space-sm h-8 px-space-sm bg-surface-container-lowest rounded-lg shadow-[0_1px_3px_rgba(17,24,39,0.05)] text-on-surface-variant cursor-pointer hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
          <span className="text-body-sm pr-6 hidden sm:inline">Search workspace...</span>
          <kbd className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant" style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}>⌘K</kbd>
        </button>

        <div className="flex items-center gap-space-xs">
          {/* Notifications */}
          <button
            onClick={() => setRightPanel(activeRightPanel === "NOTIFICATIONS" ? null : "NOTIFICATIONS")}
            className="relative p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a]" />
            )}
          </button>

          {/* CollabAI */}
          <button
            onClick={() => setRightPanel(isAIOpen ? null : "AI_COPILOT")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-on-surface transition-colors ${isAIOpen ? "bg-primary-container text-on-primary" : "bg-surface-container hover:bg-surface-container-high"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isAIOpen ? 'inherit' : '#006c49' }}>auto_awesome</span>
            <span className="text-body-sm font-medium">CollabAI</span>
          </button>
        </div>

        <div className="h-4 w-px bg-outline-variant/30" />

        {/* User avatar */}
        <div className="flex items-center gap-space-sm cursor-pointer">
          <div className="relative">
            {user?.avatarUrl ? (
              <img alt="Profile" className="w-8 h-8 rounded-full object-cover" src={user.avatarUrl} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">
                {(user?.firstName?.[0] || user?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-surface-ws" style={{ backgroundColor: '#006c49' }} />
          </div>
        </div>
      </div>
    </header>
  );
}
