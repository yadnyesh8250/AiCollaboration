import React from "react";
import { useUIStore } from "../../stores/uiStore";

export default function Topbar() {
  const { toggleSidebar, setCommandPalette, setRightPanel, activeRightPanel } = useUIStore();

  return (
    <header className="h-12 border-b border-zinc-950 bg-black px-4 flex items-center justify-between shrink-0 select-none">
      {/* Left Area: Hamburger Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="text-zinc-500 hover:text-zinc-200 cursor-pointer p-1 rounded-md hover:bg-zinc-900/30 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Breadcrumbs */}
        <div className="hidden lg:flex items-center gap-2 text-[9px] font-bold text-zinc-650 uppercase tracking-widest">
          <span>Workspace</span>
          <span className="text-zinc-800">/</span>
          <span className="text-zinc-400">Current Session</span>
        </div>
      </div>

      {/* Center Area: Global Search Input */}
      <div className="flex-1 max-w-xs mx-3">
        <button
          onClick={() => setCommandPalette(true)}
          className="w-full flex items-center justify-between h-7.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-850 rounded-lg px-2.5 text-[11px] text-zinc-500 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-600 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
            <span className="truncate">Search workspace...</span>
          </div>
          <span className="hidden sm:inline-block bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[8px] font-mono font-bold">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right Area: Status, Notification, AI Toggler */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Connection status */}
        <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          SYNCED
        </div>

        {/* AI Copilot toggler button */}
        <button
          onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
          className={`h-7.5 w-7.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
            activeRightPanel === "AI_COPILOT"
              ? "bg-purple-950/20 text-purple-400 border-purple-900/40 shadow-sm"
              : "border-zinc-900 text-zinc-550 hover:bg-zinc-900/30 hover:text-zinc-200"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
          </svg>
        </button>

        {/* Notification bell */}
        <button className="h-7.5 w-7.5 rounded-lg flex items-center justify-center border border-zinc-900 text-zinc-550 hover:bg-zinc-900/30 hover:text-zinc-200 relative cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}
