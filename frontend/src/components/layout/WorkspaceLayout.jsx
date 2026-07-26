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
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-start justify-center pt-28 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-zinc-900 bg-zinc-950/95 shadow-2xl shadow-black/80 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-900/60 h-11">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Search commands..."
                className="flex-1 bg-transparent border-0 text-xs placeholder:text-zinc-650 outline-none text-zinc-200"
              />
              <span className="text-[9px] text-zinc-500 font-bold border border-zinc-900 bg-zinc-950 px-1.5 py-0.5 rounded select-none">ESC</span>
            </div>

            {/* List options */}
            <div className="p-2 max-h-[280px] overflow-y-auto space-y-1.5 no-scrollbar">
              <div className="px-2.5 pt-1 pb-0.5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Navigation</div>
              {[
                { name: "Go to Tasks board", shortcut: "G T" },
                { name: "Go to Chat / Channels", shortcut: "G C" },
                { name: "Go to Documents", shortcut: "G D" },
                { name: "Go to Settings", shortcut: "G S" },
              ].map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => setCommandPalette(false)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg hover:bg-zinc-900/50 text-zinc-400 hover:text-white transition-all cursor-pointer text-left"
                >
                  <span className="font-medium">{cmd.name}</span>
                  <span className="text-[9px] text-zinc-650 font-mono font-bold bg-zinc-950 border border-zinc-900/80 px-1 py-0.5 rounded">{cmd.shortcut}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
