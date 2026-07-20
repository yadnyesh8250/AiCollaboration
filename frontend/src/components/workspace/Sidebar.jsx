import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";

export default function Sidebar() {
  const location = useLocation();
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then((res) => res.data.organizations),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["workspaceDashboard", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/dashboard`).then((res) => res.data.dashboard),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((res) => res.data.members),
    enabled: !!workspaceId,
  });

  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !workspaceId) return;

    socket.emit("joinWorkspace", workspaceId);

    const handlePresenceUpdate = (data) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: data,
      }));
    };

    const handleUserLeave = (data) => {
      setPresenceMap((prev) => {
        const copy = { ...prev };
        delete copy[data.userId];
        return copy;
      });
    };

    socket.on("presence:update", handlePresenceUpdate);
    socket.on("user:join", handlePresenceUpdate);
    socket.on("user:leave", handleUserLeave);

    return () => {
      socket.emit("leaveWorkspace", workspaceId);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("user:join", handlePresenceUpdate);
      socket.off("user:leave", handleUserLeave);
    };
  }, [workspaceId]);

  const activeMembersList = Object.values(presenceMap).map((presence) => {
    const member = Array.isArray(members) ? members.find((m) => m.userId === presence.userId || m.user?.id === presence.userId) : null;
    return {
      userId: presence.userId,
      name: member?.user?.username || presence.userId.substring(0, 8),
      status: presence.currentPage || "Online",
      color: "bg-emerald-500",
    };
  });

  const primaryNav = [
    {
      name: "Inbox",
      path: "/inbox",
      badge: 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" />
        </svg>
      ),
    },
    {
      name: "Chat",
      path: "/chat",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.596.596 0 0 1-.548-.548 5.86 5.86 0 0 1 .98-3.189A8.11 8.11 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m1.875-12h7.5M14.25 9h7.5m-7.5 3h7.5m-7.5 3h7.5m-7.5 3h7.5M3.75 6H7.5M3.75 9H7.5M3.75 12H7.5m-3.75 3H7.5m-3.75 3H7.5M21 3H3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
        </svg>
      ),
    },
    {
      name: "Docs",
      path: "/docs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      path: "/settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ];

  const currentOrg = orgs[0] || { id: "1", name: "A-Collab Org", slug: "acollab-org" };

  return (
    <div
      className={`h-screen bg-zinc-950 border-r border-zinc-900/60 flex flex-col justify-between transition-all duration-300 fixed lg:static inset-y-0 left-0 z-40 ${
        isSidebarCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-16" : "translate-x-0 lg:w-60"
      }`}
    >
      {/* Top Header & Switcher */}
      <div className="space-y-4 pt-4 px-3 relative overflow-y-auto no-scrollbar flex-1">
        <div className="flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <div className="relative w-full">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900/50 w-full text-left transition-colors cursor-pointer"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white text-xs font-black">
                  A
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-foreground truncate">{currentOrg.name}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-500">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 overflow-hidden py-1">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setIsOrgDropdownOpen(false)}
                      className="w-full px-3 py-1.5 text-xs text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={toggleSidebar}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded bg-primary text-white text-sm font-black shadow-md shadow-primary/20 cursor-pointer"
            >
              A
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {primaryNav.map((item) => {
            const isActive = location.pathname.startsWith(item.path) || (item.path === "/chat" && location.pathname.includes("/channels/"));
            return (
              <Link
                key={item.name}
                to={`/workspaces/${workspaceId || '1'}${item.path}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-foreground border border-zinc-850"
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-foreground"
                } ${isSidebarCollapsed ? "justify-center" : ""}`}
              >
                <span className="text-zinc-500">{item.icon}</span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge > 0 && (
                      <span className="bg-zinc-800 text-[10px] text-zinc-400 px-1.5 py-0.5 rounded font-mono border border-zinc-700/60">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Workspace Pulse Heartbeat (Only shown when expanded) */}
        {!isSidebarCollapsed && (
          <div className="bg-zinc-900/20 border border-zinc-900/85 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>Workspace Pulse</span>
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center select-none">
              <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-2 hover:border-zinc-850 transition-colors">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Open Tasks</p>
                <p className="text-xs font-black text-foreground mt-0.5">{dashboardData?.cards?.openTasks ?? 0}</p>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-2 hover:border-zinc-850 transition-colors">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Unread Msg</p>
                <p className="text-xs font-black text-foreground mt-0.5">{dashboardData?.cards?.unreadMessages ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 border-t border-zinc-900/60 pt-2">
              <span>Sprint Completion</span>
              <div className="flex items-center gap-2">
                {/* TODO: Bind to active sprint progress calculation */}
                <span className="text-emerald-500">0%</span>
                <svg className="h-3 w-12 text-emerald-500/80 shrink-0" viewBox="0 0 50 10">
                  <path d="M0 8 L10 5 L20 7 L30 3 L40 6 L50 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Presence Map Statuses (Only shown when expanded) */}
        {!isSidebarCollapsed && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-200">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3">
              Presence Map
            </div>
            <div className="space-y-1 px-1">
              {activeMembersList.length === 0 ? (
                <div className="text-[10px] text-zinc-500 italic px-3 py-1">No other active users</div>
              ) : (
                activeMembersList.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-900/30 text-[10px] text-zinc-400 select-none"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`h-1.5 w-1.5 rounded-full ${member.color}`} />
                      <span className="font-semibold text-zinc-300 truncate">{member.name}</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-medium shrink-0">({member.status})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Collapsible Projects section */}
        {!isSidebarCollapsed && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>Projects</span>
              <button className="hover:text-foreground cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
            <div className="space-y-0.5">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/workspaces/${workspaceId || '1'}/channels/${channel.slug}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/40 hover:text-foreground transition-all duration-150 cursor-pointer"
                >
                  <span className="text-zinc-500 font-medium">#</span>
                  <span className="flex-1 truncate">{channel.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Area */}
      <div className="p-3 border-t border-zinc-900/60 space-y-3 flex flex-col shrink-0">
        {/* Storage Indicator */}
        {!isSidebarCollapsed ? (
          <div className="bg-zinc-900/30 border border-zinc-900/80 rounded-lg p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-500">
              <span>85% full</span>
              <span>8.5 GB of 10 GB</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div className="h-full bg-primary w-[85%] rounded-full shadow-lg shadow-primary/40" />
            </div>
          </div>
        ) : (
          <div className="mx-auto relative h-6 w-6 flex items-center justify-center cursor-pointer" title="Storage: 85% full">
            <svg className="h-6 w-6 transform -rotate-90">
              <circle cx="12" cy="12" r="10" stroke="rgba(63,63,70,0.4)" strokeWidth="2" fill="transparent" />
              <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="2" fill="transparent" strokeDasharray={62.8} strokeDashoffset={62.8 * 0.15} />
            </svg>
          </div>
        )}

        {/* User Card */}
        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/20 text-[10px] font-bold text-primary flex items-center justify-center relative shrink-0">
              {user?.username?.substring(0, 2).toUpperCase() || "AD"}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-zinc-950" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.username || "Sarah Jenkins"}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium truncate">Active</p>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="text-zinc-500 hover:text-foreground cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
