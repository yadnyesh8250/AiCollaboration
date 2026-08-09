import React, { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { useUIStore } from "../../stores/uiStore";
import Sidebar from "../workspace/Sidebar";
import Topbar from "../workspace/Topbar";
import RightDrawer from "../workspace/RightDrawer";

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isCommandPaletteOpen, setCommandPalette, isSidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [cmdQuery, setCmdQuery] = useState("");

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

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarCollapsed]);

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPalette(true);
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        setCommandPalette(false);
        setCmdQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isCommandPaletteOpen, setCommandPalette]);

  const navCommands = [
    { label: "Go to Home", path: "", icon: "🏠", group: "Navigation" },
    { label: "Go to Tasks", path: "/tasks", icon: "✅", group: "Navigation" },
    { label: "Go to Chat", path: "/chat", icon: "💬", group: "Navigation" },
    { label: "Go to Documents", path: "/docs", icon: "📄", group: "Navigation" },
    { label: "Go to Members", path: "/members", icon: "👥", group: "Navigation" },
    { label: "Go to Settings", path: "/settings", icon: "⚙️", group: "Navigation" },
  ];

  const filteredCommands = cmdQuery.trim()
    ? navCommands.filter((c) => c.label.toLowerCase().includes(cmdQuery.toLowerCase()))
    : navCommands;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans relative">
      {/* Mobile Sidebar Backdrop */}
      {!isSidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>

      {/* Right Contextual Drawer */}
      <RightDrawer />

      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <div
          onClick={() => { setCommandPalette(false); setCmdQuery(""); }}
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl shadow-black/10 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 border-b border-border h-14">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-zinc-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent border-0 text-sm placeholder:text-zinc-400 outline-none text-foreground"
              />
              <kbd className="text-[11px] text-zinc-400 font-medium border border-zinc-200 bg-zinc-50 px-2 py-0.5 rounded select-none">ESC</kbd>
            </div>

            {/* Results */}
            <div className="p-2 max-h-[320px] overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400">No results for "{cmdQuery}"</div>
              ) : (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-zinc-400">Navigation</div>
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => {
                        navigate(`/workspaces/${workspaceId}${cmd.path}`);
                        setCommandPalette(false);
                        setCmdQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 transition-colors text-left group cursor-pointer"
                    >
                      <span className="text-base">{cmd.icon}</span>
                      <span className="flex-1 font-medium">{cmd.label}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3 h-3 text-zinc-300 group-hover:text-zinc-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border bg-zinc-50 flex items-center gap-4 text-xs text-zinc-400">
              <span><kbd className="font-medium text-zinc-500">↑↓</kbd> Navigate</span>
              <span><kbd className="font-medium text-zinc-500">↵</kbd> Open</span>
              <span><kbd className="font-medium text-zinc-500">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
