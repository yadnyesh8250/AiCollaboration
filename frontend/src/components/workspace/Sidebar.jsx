import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";
import aCollabLogo from "../../assets/logo.png";

export default function Sidebar() {
  const location = useLocation();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, clearAuth, refreshToken } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  // Channel creation
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelSlug, setNewChannelSlug] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState("PUBLIC");

  // Profile modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("profile");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileStatus, setProfileStatus] = useState("Online");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const [onlineUsers, setOnlineUsers] = useState({});

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((res) => res.data.members),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUserOnline = ({ userId }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: { status: "ONLINE", currentPage: "Dashboard" } }));
    };

    const handleUserOffline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const handlePresenceUpdate = ({ userId, currentPage, status }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: { status, currentPage } }));
    };

    const handleUserJoin = ({ userId, currentPage }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: { status: "ONLINE", currentPage } }));
    };

    const handleUserLeave = ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("user:join", handleUserJoin);
    socket.on("user:leave", handleUserLeave);

    api.get(`/workspaces/${workspaceId}/members`).then(res => {
      const activeMembers = res.data.members || [];
      activeMembers.forEach(m => {
        if (m.user && m.user.status === "ONLINE") {
          setOnlineUsers((prev) => ({ ...prev, [m.user.id]: { status: "ONLINE", currentPage: "Dashboard" } }));
        }
      });
    }).catch(err => console.error(err));

    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("user:join", handleUserJoin);
      socket.off("user:leave", handleUserLeave);
    };
  }, [workspaceId]);

  // Queries
  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then((res) => res.data.organizations),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces", orgs[0]?.id],
    queryFn: () => api.get(`/organizations/${orgs[0]?.id}/workspaces`).then((res) => res.data.workspaces),
    enabled: !!orgs[0]?.id,
  });

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];
  const currentOrg = orgs[0];

  // Mutations
  const createChannelMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/channels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", workspaceId] });
      setIsChannelModalOpen(false);
      setNewChannelName(""); setNewChannelSlug(""); setNewChannelDesc(""); setNewChannelType("PUBLIC");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/users/profile", data),
    onSuccess: (res) => { setUser(res.data.user); alert("Profile updated!"); },
    onError: (err) => alert(err.response?.data?.message || "Failed to update profile."),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.patch("/users/change-password", data),
    onSuccess: () => { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); alert("Password updated!"); },
    onError: (err) => alert(err.response?.data?.message || "Failed to change password."),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout", { refreshToken }),
    onSuccess: () => clearAuth(),
    onError: () => clearAuth(),
  });

  const handleChannelNameChange = (e) => {
    const val = e.target.value;
    setNewChannelName(val);
    setNewChannelSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !newChannelSlug.trim()) return;
    createChannelMutation.mutate({ name: newChannelName.trim(), slug: newChannelSlug.trim(), description: newChannelDesc.trim() || null, type: newChannelType });
  };

  // Helper: check active route
  const isActive = (path, exact = false) => {
    const base = `/workspaces/${workspaceId}`;
    if (exact) return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname === `${base}${path}` || (path !== "" && location.pathname.startsWith(`${base}${path}`));
  };

  const isChannelActive = (slug) => location.pathname.includes(`/channels/${slug}`);

  // Channel list — merge real with defaults
  const defaultChannels = [
    { id: "gen", name: "general", slug: "general" },
    { id: "ann", name: "announcements", slug: "announcements" },
  ];
  const mergedChannels = [...channels];
  defaultChannels.forEach((dc) => {
    if (!mergedChannels.some((c) => c.slug === dc.slug)) mergedChannels.push(dc);
  });

  // Nav item helper component (inline)
  const NavItem = ({ path, icon, label, exact = false }) => {
    const active = isActive(path, exact);
    return (
      <Link
        to={`/workspaces/${workspaceId}${path}`}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
          active
            ? "bg-accent text-primary font-semibold"
            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium"
        } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
      >
        <span className={`shrink-0 ${active ? "text-primary" : "text-zinc-400"}`}>{icon}</span>
        {!isSidebarCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const SectionLabel = ({ children }) =>
    isSidebarCollapsed ? null : (
      <div className="px-3 pt-4 pb-1">
        <span className="text-xs font-semibold text-zinc-400 tracking-wide">{children}</span>
      </div>
    );

  return (
    <>
      <div
        className={`h-screen bg-white border-r border-border flex flex-col transition-all duration-300 fixed lg:static inset-y-0 left-0 z-40 select-none ${
          isSidebarCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-[60px]" : "translate-x-0 lg:w-[240px]"
        }`}
      >
        {/* ── Workspace Switcher Header ── */}
        <div className="shrink-0 p-3 border-b border-border">
          {!isSidebarCollapsed ? (
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
              >
                {/* Brand logo */}
                <div className="h-7 w-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white">
                  <img src={aCollabLogo} alt="A-Collab" className="h-7 w-7 object-contain" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{activeWorkspace?.name || "Workspace"}</p>
                  <p className="text-xs text-zinc-400 truncate">{currentOrg?.name || "Organization"}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-zinc-400 shrink-0">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-50 py-2 overflow-hidden">
                  <div className="px-3 py-1 text-xs font-medium text-zinc-400">Workspaces</div>
                  {workspaces.map((w) => (
                    <Link
                      key={w.id}
                      to={`/workspaces/${w.id}`}
                      onClick={() => setIsOrgDropdownOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${w.id === workspaceId ? "text-primary font-semibold" : "text-zinc-700"}`}
                    >
                      <div className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${w.id === workspaceId ? "bg-accent text-primary" : "bg-zinc-100 text-zinc-500"}`}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      {w.name}
                    </Link>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <Link
                      to="/create-org"
                      onClick={() => setIsOrgDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-primary hover:bg-zinc-50 transition-colors"
                    >
                      <span className="text-base">+</span> New workspace
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={toggleSidebar}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white cursor-pointer overflow-hidden"
              title={activeWorkspace?.name || "A-Collab"}
            >
              <img src={aCollabLogo} alt="A-Collab" className="h-8 w-8 object-contain" />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2">
          {/* Workspace section */}
          <SectionLabel>Workspace</SectionLabel>
          <nav className="space-y-0.5">
            <NavItem path="" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            } label="Home" exact />
          </nav>

          {/* Communication section */}
          <SectionLabel>Communication</SectionLabel>
          <nav className="space-y-0.5">
            <NavItem path="/chat" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            } label="Chat" />

            {/* Channels sub-list */}
            {!isSidebarCollapsed && (
              <div className="pl-4 mt-1 space-y-0.5">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-zinc-400 font-medium">Channels</span>
                  <button
                    onClick={() => setIsChannelModalOpen(true)}
                    className="text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
                {mergedChannels.slice(0, 6).map((channel) => (
                  <Link
                    key={channel.id}
                    to={`/workspaces/${workspaceId}/channels/${channel.slug}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                      isChannelActive(channel.slug)
                        ? "bg-accent text-primary font-semibold"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-zinc-400 text-xs font-medium">#</span>
                    <span className="truncate">{channel.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Work section */}
          <SectionLabel>Work</SectionLabel>
          <nav className="space-y-0.5">
            <NavItem path="/tasks" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5 3 12l3.75 4.5m6.75-9L17.25 12l-3.75 4.5m-3.375.75 1.875-9" />
              </svg>
            } label="Tasks" />
            <NavItem path="/calendar" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            } label="Calendar" />
          </nav>

          {/* Knowledge section */}
          <SectionLabel>Knowledge</SectionLabel>
          <nav className="space-y-0.5">
            <NavItem path="/docs" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            } label="Documents" />
          </nav>

          {/* Team section */}
          <SectionLabel>Team Members</SectionLabel>
          <nav className="space-y-1 px-2 max-h-[140px] overflow-y-auto no-scrollbar">
            {members.map((m) => {
              const isOnline = !!onlineUsers[m.user.id];
              const presenceInfo = onlineUsers[m.user.id];
              const curPage = presenceInfo?.currentPage;
              
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-colors font-medium select-none ${
                    m.user.id === user?.id ? "text-zinc-900 font-semibold" : "text-zinc-650"
                  }`}
                >
                  <div className="relative shrink-0">
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt="avatar" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-550 border border-zinc-200">
                        {m.user.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 border border-white" />
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="truncate">
                        {m.user.username}
                        {curPage && curPage !== "Dashboard" && (
                          <span className="text-[10px] text-zinc-400 font-normal ml-1">
                            ({curPage.toLowerCase()})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Settings section */}
          <SectionLabel>Settings</SectionLabel>
          <nav className="space-y-0.5">
            <NavItem path="/settings" icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            } label="Settings" />
          </nav>
        </div>

        {/* ── Bottom user card ── */}
        <div className="shrink-0 p-3 border-t border-border">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className={`flex items-center gap-2.5 w-full rounded-lg p-2 hover:bg-zinc-50 transition-colors cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""}`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || "ME"}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-semibold text-zinc-900 truncate">{user?.username || "Guest"}</p>
                <p className="text-xs text-zinc-400 truncate">{user?.email || "member"}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ══ Profile Settings Modal ══ */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Account Settings</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Manage your profile and security</p>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-6">
              {["profile", "security"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-all cursor-pointer capitalize ${
                    profileTab === tab ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab === "profile" ? "Profile" : "Security"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 no-scrollbar">
              {profileTab === "profile" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateProfileMutation.mutate({ username: profileUsername, firstName: profileFirstName, lastName: profileLastName, bio: profileBio, avatarUrl: profileAvatarUrl });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Username</label>
                    <input className="ac-input" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} placeholder="username" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">First Name</label>
                      <input className="ac-input" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} placeholder="First" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">Last Name</label>
                      <input className="ac-input" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} placeholder="Last" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Bio</label>
                    <textarea className="ac-textarea min-h-[80px]" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Tell your team about yourself..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Avatar URL</label>
                    <input className="ac-input" value={profileAvatarUrl} onChange={(e) => setProfileAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary w-full">
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Presence Status</label>
                    <select className="ac-select" value={profileStatus} onChange={(e) => setProfileStatus(e.target.value)}>
                      <option value="Online">🟢 Online</option>
                      <option value="Away">🟡 Away</option>
                      <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                      <option value="Offline">⚫ Invisible</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateProfileMutation.mutate({ status: profileStatus })}
                      disabled={updateProfileMutation.isPending}
                      className="btn-secondary w-full mt-3"
                    >
                      Update Status
                    </button>
                  </div>

                  {/* Change Password */}
                  <div className="border-t border-border pt-5">
                    <h4 className="text-sm font-semibold text-zinc-900 mb-4">Change Password</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newPassword !== confirmPassword) { alert("Passwords do not match."); return; }
                        changePasswordMutation.mutate({ oldPassword, newPassword });
                      }}
                      className="space-y-3"
                    >
                      <input type="password" className="ac-input" placeholder="Current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                      <input type="password" className="ac-input" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      <input type="password" className="ac-input" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      <button type="submit" disabled={changePasswordMutation.isPending} className="btn-secondary w-full">
                        {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                      </button>
                    </form>
                  </div>

                  {/* Danger zone */}
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => { if (confirm("Sign out of A-Collab?")) logoutMutation.mutate(); }}
                      disabled={logoutMutation.isPending}
                      className="btn-danger w-full"
                    >
                      {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Create Channel Modal ══ */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-zinc-900">Create Channel</h3>
              <button onClick={() => setIsChannelModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Channel Name</label>
                <input className="ac-input" placeholder="e.g. design-team" value={newChannelName} onChange={handleChannelNameChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Slug</label>
                <input className="ac-input font-mono" placeholder="design-team" value={newChannelSlug} onChange={(e) => setNewChannelSlug(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                <input className="ac-input" placeholder="What's this channel for?" value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Visibility</label>
                <select className="ac-select" value={newChannelType} onChange={(e) => setNewChannelType(e.target.value)}>
                  <option value="PUBLIC">Public — anyone in workspace</option>
                  <option value="PRIVATE">Private — invite only</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsChannelModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createChannelMutation.isPending} className="btn-primary flex-1">
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
