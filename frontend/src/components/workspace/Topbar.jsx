import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";

const routeLabels = {
  "": "Home",
  "tasks": "Tasks",
  "chat": "Chat",
  "docs": "Documents",
  "settings": "Settings",
  "members": "Members",
  "sprints": "Sprints",
  "calendar": "Calendar",
  "activity": "Activity",
  "analytics": "Analytics",
};

export default function Topbar() {
  const { toggleSidebar, setCommandPalette, setRightPanel, activeRightPanel } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const { workspaceId } = useParams();

  // Derive current section name from path
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentSection = pathSegments.length > 2 ? pathSegments[pathSegments.length - 1] : "";
  const sectionLabel = routeLabels[currentSection] ?? "Workspace";

  const isAIOpen = activeRightPanel === "AI_COPILOT";

  return (
    <header className="h-12 border-b border-border bg-white px-5 flex items-center justify-between shrink-0 select-none">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-zinc-400 font-medium">A-Collab</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3 text-zinc-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-zinc-700 font-semibold">{sectionLabel}</span>
        </div>
      </div>

      {/* Center: Search trigger */}
      <div className="flex-1 max-w-xs mx-4">
        <button
          onClick={() => setCommandPalette(true)}
          className="w-full flex items-center justify-between h-9 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 text-sm text-zinc-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
            <span className="text-sm">Search workspace...</span>
          </div>
          <kbd className="hidden sm:inline-block text-[11px] text-zinc-400 border border-zinc-200 bg-white px-1.5 py-0.5 rounded font-medium">⌘K</kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Synced status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium mr-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>

        {/* AI Copilot toggle */}
        <button
          onClick={() => setRightPanel(isAIOpen ? null : "AI_COPILOT")}
          className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
            isAIOpen
              ? "bg-violet-50 text-violet-600 border-violet-200 shadow-sm"
              : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 hover:border-zinc-300"
          }`}
          title="CollabAI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
          </svg>
        </button>

        {/* Notifications */}
        <button className="h-8 w-8 rounded-lg flex items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 hover:border-zinc-300 transition-all cursor-pointer relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* User avatar */}
        <div className="h-7 w-7 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary ml-1 cursor-pointer hover:border-primary/40 transition-colors">
          {user?.username?.substring(0, 2).toUpperCase() || "ME"}
        </div>
      </div>
    </header>
  );
}
