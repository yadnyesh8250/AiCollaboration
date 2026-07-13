import React from "react";
import { useUIStore } from "../../stores/uiStore";

export default function Topbar() {
  const { isSidebarCollapsed, toggleSidebar, setCommandPalette, setRightPanel, activeRightPanel } = useUIStore();

  return (
    <header className="h-14 border-b border-zinc-900/60 bg-zinc-950 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left Area: Hamburger Toggle (visible on collapsed desktop and always on mobile) & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="text-zinc-400 hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-zinc-900/40 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Breadcrumbs - Hidden on Mobile/Tablet to avoid overlaps */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <span>Home</span>
          <span className="text-zinc-700">/</span>
          <span>Projects</span>
          <span className="text-zinc-700">/</span>
          <span>Acme</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300">Skynet Project</span>
        </div>
      </div>

      {/* Center Area: Global Search Input */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-3">
        <button
          onClick={() => setCommandPalette(true)}
          className="w-full flex items-center justify-between h-8 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/60 rounded-lg px-3 text-xs text-zinc-500/80 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-500 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
            <span className="truncate">Search...</span>
          </div>
          <span className="hidden sm:inline-block bg-zinc-850 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right Area: Status, Notification, AI Toggler */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Connection status */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Online
        </div>

        {/* AI Copilot toggler button */}
        <button
          onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
          className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
            activeRightPanel === "AI_COPILOT"
              ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900/40 hover:text-foreground"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
          </svg>
        </button>

        {/* Notification bell */}
        <button className="h-8 w-8 rounded-lg flex items-center justify-center border border-zinc-800 text-zinc-400 hover:bg-zinc-900/40 hover:text-foreground relative cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary border border-zinc-950" />
        </button>
      </div>
    </header>
  );
}
