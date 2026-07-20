import React, { useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { useUIStore } from "../../stores/uiStore";
import Sidebar from "../workspace/Sidebar";
import Topbar from "../workspace/Topbar";
import RightDrawer from "../workspace/RightDrawer";

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { isCommandPaletteOpen, setCommandPalette, isSidebarCollapsed, setSidebarCollapsed } = useUIStore();

  const { error } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((res) => res.data.workspace),
    enabled: !!workspaceId,
    retry: false,
  });

  useEffect(() => {
    if (error && error.response?.status === 403) {
      navigate("/", { replace: true });
    }
  }, [error, navigate]);

  // Handle auto-collapsing sidebar on smaller viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarCollapsed]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-foreground overflow-hidden font-sans relative">
      {/* Mobile Sidebar Backdrop overlay */}
      {!isSidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* 1. Left Sidebar */}
      <Sidebar />

      {/* 2. Main Content Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto relative bg-zinc-900/10">
          <Outlet />
        </main>
      </div>

      {/* 3. Right Contextual Panel Drawer */}
      <RightDrawer />

      {/* Command Palette Overlay Modal */}
      {isCommandPaletteOpen && (
        <div
          onClick={() => setCommandPalette(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-900/60 h-12">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-zinc-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Search commands or type..."
                className="flex-1 bg-transparent border-0 text-sm placeholder:text-zinc-500/60 outline-none text-foreground"
              />
              <span className="text-[10px] text-zinc-500 font-semibold border border-zinc-800 px-1.5 py-0.5 rounded">ESC</span>
            </div>

            {/* List options */}
            <div className="p-2 space-y-1">
              {[
                { name: "Create New Task", shortcut: "⌘N" },
                { name: "Go to Chat", shortcut: "⌘C" },
                { name: "Switch Workspace", shortcut: "⌘W" },
                { name: "Open AI Copilot", shortcut: "⌘A" },
                { name: "Search Documents", shortcut: "⌘D" },
              ].map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => setCommandPalette(false)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <span>{cmd.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{cmd.shortcut}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
