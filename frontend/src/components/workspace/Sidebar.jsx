import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";
import FormField from "../common/FormField";

export default function Sidebar() {
  const location = useLocation();
  const { workspaceId } = useParams();
  const { user, setUser, clearAuth, refreshToken } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  // Channel Creation States
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelSlug, setNewChannelSlug] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState("PUBLIC");

  // Scratchpad State for Solo User
  const [scratchpadText, setScratchpadText] = useState(
    () => localStorage.getItem("acollab-scratchpad") || ""
  );

  // Profile Modal & Edit States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "account"
  const [profileUsername, setProfileUsername] = useState("");
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileStatus, setProfileStatus] = useState("Online");

  // Change Password States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync user profile inputs with authStore user state
  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || "");
      setProfileFirstName(user.firstName || "");
      setProfileLastName(user.lastName || "");
      setProfileBio(user.bio || "");
      setProfileAvatarUrl(user.avatarUrl || "");
      setProfileStatus(user.status || "Online");
    }
  }, [user]);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then((res) => res.data.organizations),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  const createChannelMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/channels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      setIsChannelModalOpen(false);
      setNewChannelName("");
      setNewChannelSlug("");
      setNewChannelDesc("");
      setNewChannelType("PUBLIC");
    },
  });

  const handleChannelNameChange = (e) => {
    const val = e.target.value;
    setNewChannelName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setNewChannelSlug(generatedSlug);
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !newChannelSlug.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName.trim(),
      slug: newChannelSlug.trim(),
      description: newChannelDesc.trim() || null,
      type: newChannelType,
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/users/profile", data),
    onSuccess: (res) => {
      setUser(res.data.user);
      alert("Profile updated successfully!");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to update profile.");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.patch("/users/change-password", data),
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Password updated successfully!");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to change password.");
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout", { refreshToken }),
    onSuccess: () => {
      clearAuth();
    },
    onError: () => {
      // Force clear client session even if backend logout request fails
      clearAuth();
    }
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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" />
        </svg>
      ),
    },
    {
      name: "Chat",
      path: "/chat",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.596.596 0 0 1-.548-.548 5.86 5.86 0 0 1 .98-3.189A8.11 8.11 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m1.875-12h7.5M14.25 9h7.5m-7.5 3h7.5m-7.5 3h7.5m-7.5 3h7.5M3.75 6H7.5M3.75 9H7.5M3.75 12H7.5m-3.75 3H7.5m-3.75 3H7.5M21 3H3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
        </svg>
      ),
    },
    {
      name: "Docs",
      path: "/docs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      path: "/settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ];

  const currentOrg = orgs[0] || { id: "1", name: "A-Collab Org", slug: "acollab-org" };

  return (
    <>
      <div
        className={`h-screen bg-black border-r border-zinc-950 flex flex-col justify-between transition-all duration-300 fixed lg:static inset-y-0 left-0 z-40 select-none ${
          isSidebarCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-16" : "translate-x-0 lg:w-56"
        }`}
      >
        {/* Top Header & Switcher */}
        <div className="space-y-5 pt-5 px-3 relative overflow-y-auto no-scrollbar flex-1">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed ? (
              <div className="relative w-full">
                <button
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-900/40 w-full text-left transition-colors cursor-pointer border border-transparent hover:border-zinc-900"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-white text-black text-[10px] font-black">
                    A
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-zinc-200 truncate">{currentOrg.name}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-zinc-650">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {isOrgDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-900 rounded-lg shadow-xl z-20 overflow-hidden py-1">
                    {orgs.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => setIsOrgDropdownOpen(false)}
                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                className="mx-auto flex h-6 w-6 items-center justify-center rounded bg-white text-black text-xs font-black shadow-sm cursor-pointer"
              >
                A
              </button>
            )}
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-0.5">
            {primaryNav.map((item) => {
              const isActive = location.pathname.endsWith(item.path) || (item.path === "/chat" && location.pathname.includes("/channels/"));
              return (
                <Link
                  key={item.name}
                  to={`/workspaces/${workspaceId || "1"}${item.path}`}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-zinc-900/35 text-white border border-zinc-900"
                      : "text-zinc-550 hover:bg-zinc-900/20 hover:text-zinc-200 border border-transparent"
                  } ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <span className="text-zinc-500 shrink-0">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge > 0 && (
                        <span className="bg-zinc-900 text-[9px] text-zinc-500 px-1 py-0.5 rounded font-mono border border-zinc-800">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapsible Projects / Channels section */}
          {!isSidebarCollapsed && (
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between px-3 text-[9px] font-bold text-zinc-650 uppercase tracking-widest">
                <span>Channels</span>
                <button
                  onClick={() => setIsChannelModalOpen(true)}
                  className="hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
              <div className="space-y-0.5">
                {channels.map((channel) => {
                  const isActive = location.pathname.endsWith(`/channels/${channel.slug}`);
                  return (
                    <Link
                      key={channel.id}
                      to={`/workspaces/${workspaceId || "1"}/channels/${channel.slug}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-zinc-900/35 text-white border border-zinc-900"
                          : "text-zinc-550 hover:bg-zinc-900/20 hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <span className="text-zinc-600 font-medium shrink-0">#</span>
                      <span className="flex-1 truncate">{channel.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workspace Telemetry Dashboard Stats */}
          {!isSidebarCollapsed && (
            <div className="bg-zinc-950/20 border border-zinc-900/80 rounded-xl p-3.5 space-y-3.5 animate-in fade-in duration-200 select-none">
              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                <span>WORKSPACE METRICS</span>
                <span className="flex h-1.5 w-1.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-zinc-950/30 border border-zinc-900 rounded-lg p-2">
                  <p className="text-[8px] text-zinc-650 font-bold uppercase tracking-wider">TASKS</p>
                  <p className="text-xs font-bold text-zinc-300 mt-0.5">{dashboardData?.cards?.openTasks ?? 0}</p>
                </div>
                <div className="bg-zinc-950/30 border border-zinc-900 rounded-lg p-2">
                  <p className="text-[8px] text-zinc-650 font-bold uppercase tracking-wider">UNREAD</p>
                  <p className="text-xs font-bold text-zinc-300 mt-0.5">{dashboardData?.cards?.unreadMessages ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Scratchpad / Notepad */}
          {!isSidebarCollapsed && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-200">
              <div className="text-[9px] font-bold text-zinc-650 uppercase tracking-widest px-3">
                Quick Scratchpad
              </div>
              <div className="px-3 pb-1">
                <textarea
                  placeholder="Jot down a quick thought..."
                  value={scratchpadText}
                  onChange={(e) => {
                    setScratchpadText(e.target.value);
                    localStorage.setItem("acollab-scratchpad", e.target.value);
                  }}
                  className="w-full min-h-[75px] rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5 text-[10px] text-zinc-350 placeholder:text-zinc-700 outline-none focus:border-zinc-800 transition-all resize-none font-sans leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-zinc-900/60 space-y-3 flex flex-col shrink-0">
          {/* Storage bar */}
          {!isSidebarCollapsed ? (
            <div className="bg-zinc-950/30 border border-zinc-900 rounded-lg p-2.5 space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-600">
                <span>STORAGE</span>
                <span>85% FULL</span>
              </div>
              <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                <div className="h-full bg-white w-[85%] rounded-full" />
              </div>
            </div>
          ) : (
            <div className="mx-auto relative h-5 w-5 flex items-center justify-center cursor-pointer" title="Storage: 85% full">
              <svg className="h-5 w-5 transform -rotate-90">
                <circle cx="10" cy="10" r="8" stroke="rgba(63,63,70,0.4)" strokeWidth="1.5" fill="transparent" />
                <circle cx="10" cy="10" r="8" stroke="#ffffff" strokeWidth="1.5" fill="transparent" strokeDasharray={50.2} strokeDashoffset={50.2 * 0.15} />
              </svg>
            </div>
          )}

          {/* User Profile bar */}
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity cursor-pointer flex-1"
            >
              <div className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center relative shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || "AD"}
                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-zinc-950" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-zinc-200 truncate">
                    {user?.username || "Guest User"}
                  </p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{user?.status || "Online"}</p>
                </div>
              )}
            </button>

            {!isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="text-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Profile & Account Settings Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-zinc-900 bg-zinc-950 p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2 select-none">
                <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-400 flex items-center justify-center uppercase shrink-0">
                  {user?.username?.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  Account Settings
                </h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-zinc-650 hover:text-white cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab switchers */}
            <div className="flex border-b border-zinc-900/60 pb-1 text-[10px] font-bold tracking-widest text-zinc-550 uppercase select-none">
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-1 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === "profile" ? "border-white text-white" : "border-transparent hover:text-zinc-350"
                }`}
              >
                Profile Info
              </button>
              <button
                onClick={() => setActiveTab("account")}
                className={`pb-1 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === "account" ? "border-white text-white" : "border-transparent hover:text-zinc-355"
                }`}
              >
                Security & Status
              </button>
            </div>

            {/* Tabs content container */}
            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 no-scrollbar">
              {activeTab === "profile" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateProfileMutation.mutate({
                      username: profileUsername,
                      firstName: profileFirstName,
                      lastName: profileLastName,
                      bio: profileBio,
                      avatarUrl: profileAvatarUrl,
                    });
                  }}
                  className="space-y-4"
                >
                  <FormField
                    label="Username"
                    name="username"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label="First Name"
                      name="firstName"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                    />
                    <FormField
                      label="Last Name"
                      name="lastName"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block select-none">Bio</label>
                    <textarea
                      placeholder="Tell us about yourself..."
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      className="w-full min-h-[60px] rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 py-2 text-xs text-foreground placeholder:text-zinc-600/70 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all resize-none"
                    />
                  </div>

                  <FormField
                    label="Avatar URL"
                    name="avatarUrl"
                    value={profileAvatarUrl}
                    onChange={(e) => setProfileAvatarUrl(e.target.value)}
                  />

                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="w-full h-8.5 rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile Details"}
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* Status update */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateProfileMutation.mutate({ status: profileStatus });
                    }}
                    className="space-y-3.5 border-b border-zinc-900 pb-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block select-none">Presence Status</label>
                      <select
                        value={profileStatus}
                        onChange={(e) => setProfileStatus(e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
                      >
                        <option value="Online">🟢 Online</option>
                        <option value="Away">🟡 Away</option>
                        <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                        <option value="Offline">⚫ Invisible</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="w-full h-8 px-3 rounded-lg border border-zinc-900 hover:bg-zinc-900/30 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                    >
                      Update Status
                    </button>
                  </form>

                  {/* Password Change */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newPassword !== confirmPassword) {
                        alert("Passwords do not match.");
                        return;
                      }
                      changePasswordMutation.mutate({ oldPassword, newPassword });
                    }}
                    className="space-y-4 border-b border-zinc-900 pb-4"
                  >
                    <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest select-none">Change Password</h4>
                    <FormField
                      label="Current Password"
                      name="oldPassword"
                      type="password"
                      placeholder="••••••••"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                    <FormField
                      label="New Password"
                      name="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <FormField
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="w-full h-8 px-3 rounded-lg border border-zinc-900 hover:bg-zinc-900/30 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                    </button>
                  </form>

                  {/* Sign Out Warning Area */}
                  <div className="pt-2 select-none">
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to sign out?")) {
                          logoutMutation.mutate();
                        }
                      }}
                      disabled={logoutMutation.isPending}
                      className="w-full h-9 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-900/25 text-xs font-bold text-red-400 hover:text-red-300 transition-all cursor-pointer"
                    >
                      {logoutMutation.isPending ? "Signing out..." : "Sign Out of A-Collab"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal Overlay */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h3 className="text-sm font-bold text-zinc-200">Create Channel</h3>
              <button
                onClick={() => setIsChannelModalOpen(false)}
                className="text-zinc-650 hover:text-white cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <FormField
                label="Channel Name"
                name="name"
                placeholder="e.g. general"
                value={newChannelName}
                onChange={handleChannelNameChange}
                register={null} // Controlled field manually handled
              />

              <FormField
                label="Slug"
                name="slug"
                placeholder="e.g. general-channel"
                value={newChannelSlug}
                onChange={(e) => setNewChannelSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
                register={null} // Controlled field manually handled
                inputClassName="font-mono"
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="What is this channel about..."
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground placeholder:text-zinc-600/70 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-300 outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value="PUBLIC">Public (everyone in workspace can view)</option>
                  <option value="PRIVATE">Private (invite-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-zinc-900 hover:bg-zinc-900/30 text-xs font-semibold text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createChannelMutation.isPending}
                  className="h-9 px-4 rounded-lg bg-white text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
