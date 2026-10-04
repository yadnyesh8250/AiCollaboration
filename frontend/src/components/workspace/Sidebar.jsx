import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";
import aCollabLogo from "../../assets/logo.png";

/* ══════════════════════════════════════════════════════
   A-Collab Sidebar — Stitch Workspace OS Design
   ══════════════════════════════════════════════════════ */
export default function Sidebar() {
  const location = useLocation();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, clearAuth, refreshToken } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  // Channel creation state
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelSlug, setNewChannelSlug] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState("PUBLIC");

  // Profile modal state
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

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUserOnline = ({ userId }) => setOnlineUsers(p => ({ ...p, [userId]: { status: "ONLINE" } }));
    const handleUserOffline = ({ userId }) => setOnlineUsers(p => { const n = { ...p }; delete n[userId]; return n; });
    const handlePresenceUpdate = ({ userId, currentPage, status }) => setOnlineUsers(p => ({ ...p, [userId]: { status, currentPage } }));
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("presence:update", handlePresenceUpdate);
    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [workspaceId]);

  // Data queries
  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then(res => res.data.organizations),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then(res => res.data.channels),
    enabled: !!workspaceId,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces", orgs[0]?.id],
    queryFn: () => api.get(`/organizations/${orgs[0]?.id}/workspaces`).then(res => res.data.workspaces),
    enabled: !!orgs[0]?.id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then(res => res.data.members),
    enabled: !!workspaceId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then(res => res.data.notifications || []),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const activeWorkspace = workspaces.find(w => w.id === workspaceId) || workspaces[0];
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
    onSuccess: (res) => { setUser(res.data.user); },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.patch("/users/change-password", data),
    onSuccess: () => { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); },
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
    createChannelMutation.mutate({
      name: newChannelName.trim(),
      slug: newChannelSlug.trim(),
      description: newChannelDesc.trim() || null,
      type: newChannelType,
    });
  };

  // Active route checks
  const base = `/workspaces/${workspaceId}`;
  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === base || location.pathname === `${base}/`;
    return location.pathname === `${base}${path}` || (path !== "" && location.pathname.startsWith(`${base}${path}`));
  };
  const isChannelActive = (slug) => location.pathname.includes(`/channels/${slug}`);

  // Build DM list from online members (exclude self)
  const otherMembers = members.filter(m => m.user?.id !== user?.id).slice(0, 5);

  // User initials helper
  const getInitials = (u) => {
    if (!u) return "?";
    const fn = u.firstName || u.username || "";
    const ln = u.lastName || "";
    return (fn[0] || "") + (ln[0] || fn[1] || "").toUpperCase();
  };

  const displayName = user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || user.email || "User") : "User";
  const userInitials = getInitials(user);

  // Status dot color
  const statusColor = { Online: "#006c49", Away: "#d97706", "Do Not Disturb": "#ba1a1a", Offline: "#6f7976" };
  const currentStatusColor = statusColor[user?.status || "Online"] || "#006c49";

  if (isSidebarCollapsed) {
    return (
      <aside className="hidden lg:flex relative h-full w-14 shrink-0 bg-surface-container-low border-r border-border/60 z-20 flex-col items-center py-3 gap-2 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>menu</span>
        </button>
        {[
          { path: "", icon: "cottage", exact: true },
          { path: "/tasks", icon: "check_circle" },
          { path: "/chat", icon: "forum" },
          { path: "/docs", icon: "description" },
        ].map(({ path, icon, exact }) => (
          <Link
            key={icon}
            to={`${base}${path}`}
            className={`p-2 rounded-lg transition-colors ${isActive(path, exact) ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
          </Link>
        ))}
      </aside>
    );
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 lg:relative lg:z-20 h-full w-64 shrink-0 bg-surface-container-low border-r border-border/60 flex flex-col justify-between overflow-y-auto shadow-[0_1px_8px_rgba(0,0,0,0.04)] no-scrollbar">
        <div className="flex flex-col">
          {/* ── Header: Logo ── */}
          <div className="h-14 px-space-md flex items-center justify-between bg-surface-container-low flex-shrink-0">
            <div className="flex items-center gap-space-sm">
              <img alt="A-Collab" className="h-7 w-auto object-contain" src={aCollabLogo} onError={e => { e.target.style.display='none'; }} />
              <span className="text-headline-sm text-on-surface tracking-tight">A-Collab</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors"
              title="Collapse sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>menu_open</span>
            </button>
          </div>

          {/* ── Workspace Selector ── */}
          <div className="px-space-md py-space-xs">
            <button
              onClick={() => setIsOrgDropdownOpen(p => !p)}
              className="w-full flex items-center justify-between px-space-sm py-1.5 bg-surface-container-lowest rounded-lg shadow-[0_1px_3px_rgba(17,24,39,0.05)] cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#006c49' }} />
                <span className="text-body-sm text-on-surface font-medium truncate">
                  {activeWorkspace?.name || currentOrg?.name || "Workspace"}
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0" style={{ fontSize: 16 }}>
                {isOrgDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Workspace dropdown */}
            {isOrgDropdownOpen && workspaces.length > 0 && (
              <div className="mt-1 bg-surface-container-lowest rounded-lg shadow-md border border-outline-variant/30 overflow-hidden">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => { navigate(`/workspaces/${ws.id}`); setIsOrgDropdownOpen(false); }}
                    className={`w-full flex items-center gap-space-sm px-space-sm py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left ${ws.id === workspaceId ? "bg-surface-container-low font-medium" : ""}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] flex-shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Primary Navigation ── */}
          <div className="px-space-md pt-space-sm">
            <nav className="flex flex-col gap-0.5">
              {[
                { path: "", exact: true, icon: "cottage", label: "Home" },
                { path: "/tasks", icon: "check_circle", label: "My Tasks" },
                { path: "/docs", icon: "description", label: "Documents" },
                { path: "/settings", icon: "settings", label: "Settings" },
              ].map(({ path, exact, icon, label }) => {
                const active = isActive(path, exact);
                return (
                  <Link
                    key={label}
                    to={`${base}${path}`}
                    className={`flex items-center justify-between px-space-sm py-1.5 rounded-lg transition-colors ${active ? "bg-primary-container text-on-primary font-medium" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                      <span className="text-body-sm">{label}</span>
                    </div>
                  </Link>
                );
              })}

              {/* Inbox with badge */}
              <Link
                to={`${base}/chat`}
                className={`flex items-center justify-between px-space-sm py-1.5 rounded-lg transition-colors ${isActive("/chat") ? "bg-primary-container text-on-primary font-medium" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>all_inbox</span>
                  <span className="text-body-sm">Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-label-sm px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary" style={{ fontSize: 10 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Search */}
              <button
                onClick={() => useUIStore.getState().setCommandPalette(true)}
                className="flex items-center justify-between px-space-sm py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left"
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
                  <span className="text-body-sm">Search</span>
                </div>
                <span className="text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant" style={{ fontSize: 10 }}>⌘K</span>
              </button>
            </nav>
          </div>

          {/* ── Channels ── */}
          <div className="px-space-md pt-space-lg">
            <div className="flex items-center justify-between px-space-sm mb-1 text-on-surface-variant">
              <span className="text-label-sm font-medium tracking-wider uppercase" style={{ fontSize: 10 }}>Channels</span>
              <button
                onClick={() => setIsChannelModalOpen(true)}
                className="hover:text-on-surface transition-colors"
                title="Create channel"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              </button>
            </div>
            <nav className="flex flex-col gap-0.5">
              {channels.slice(0, 8).map(ch => {
                const active = isChannelActive(ch.slug);
                return (
                  <Link
                    key={ch.id}
                    to={`${base}/channels/${ch.slug}`}
                    className={`flex items-center gap-space-sm px-space-sm py-1 rounded-lg transition-colors ${active ? "bg-primary-container text-on-primary font-medium" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
                  >
                    <span className="text-label-md text-outline" style={{ fontFamily: 'JetBrains Mono', fontSize: 12, lineHeight: 1 }}>#</span>
                    <span className="text-body-sm truncate">{ch.name}</span>
                  </Link>
                );
              })}
              {channels.length === 0 && (
                <button
                  onClick={() => setIsChannelModalOpen(true)}
                  className="flex items-center gap-space-sm px-space-sm py-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
                  <span className="text-body-sm">Create first channel</span>
                </button>
              )}
            </nav>
          </div>

          {/* ── Direct Messages ── */}
          <div className="px-space-md pt-space-lg pb-space-lg">
            <div className="flex items-center justify-between px-space-sm mb-1 text-on-surface-variant">
              <span className="text-label-sm font-medium tracking-wider uppercase" style={{ fontSize: 10 }}>Direct Messages</span>
              <button className="hover:text-on-surface transition-colors" title="New DM">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              </button>
            </div>
            <nav className="flex flex-col gap-0.5">
              {/* Self */}
              <div className="flex items-center justify-between px-space-sm py-1 rounded-lg text-on-surface-variant">
                <div className="flex items-center gap-space-sm">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatusColor }} />
                  <span className="text-body-sm truncate">{user?.firstName || user?.username || "You"}</span>
                </div>
                <span className="text-label-sm text-outline" style={{ fontSize: 10 }}>(You)</span>
              </div>

              {/* Other members */}
              {otherMembers.map(m => {
                const isOnline = onlineUsers[m.user?.id];
                return (
                  <div
                    key={m.user?.id}
                    className="flex items-center gap-space-sm px-space-sm py-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isOnline ? '#006c49' : '#bec9c5' }}
                    />
                    <span className="text-body-sm truncate">
                      {m.user?.firstName && m.user?.lastName
                        ? `${m.user.firstName} ${m.user.lastName}`
                        : m.user?.username || "Member"}
                    </span>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── Bottom: Profile ── */}
        <div className="p-space-sm bg-surface-container-lowest shadow-[0_-1px_3px_rgba(17,24,39,0.03)] flex-shrink-0">
          {/* Help & Settings */}
          <nav className="flex flex-col gap-0.5 mb-2">
            <Link
              to="/help"
              className="flex items-center gap-space-sm px-space-sm py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help_outline</span>
              <span className="text-body-sm">Help & Docs</span>
            </Link>
          </nav>

          {/* User profile */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <div className="relative">
                {user?.avatarUrl ? (
                  <img alt="Profile" className="w-8 h-8 rounded-full object-cover" src={user.avatarUrl} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">
                    {userInitials}
                  </div>
                )}
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-surface-container-lowest"
                  style={{ backgroundColor: currentStatusColor }}
                />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-body-sm font-medium text-on-surface truncate">{displayName}</span>
                <span className="text-label-sm text-[#006c49] truncate" style={{ fontSize: 10 }}>
                  {user?.status || "Online"}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>more_vert</span>
          </button>
        </div>
      </aside>

      {/* ══ Profile Modal ══ */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Account Settings</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="flex border-b border-zinc-100">
              {["profile", "status"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${profileTab === tab ? "text-[#00433b] border-b-2 border-[#00433b]" : "text-zinc-400 hover:text-zinc-600"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-6">
              {profileTab === "profile" ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate({ username: profileUsername, firstName: profileFirstName, lastName: profileLastName, bio: profileBio, avatarUrl: profileAvatarUrl }); }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Username</label>
                    <input className="ac-input" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} placeholder="username" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">First Name</label>
                      <input className="ac-input" value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">Last Name</label>
                      <input className="ac-input" value={profileLastName} onChange={e => setProfileLastName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Avatar URL</label>
                    <input className="ac-input" value={profileAvatarUrl} onChange={e => setProfileAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary w-full">
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
                    <select className="ac-select" value={profileStatus} onChange={e => setProfileStatus(e.target.value)}>
                      <option value="Online">🟢 Online</option>
                      <option value="Away">🟡 Away</option>
                      <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                      <option value="Offline">⚫ Invisible</option>
                    </select>
                    <button
                      onClick={() => updateProfileMutation.mutate({ status: profileStatus })}
                      disabled={updateProfileMutation.isPending}
                      className="btn-secondary w-full mt-3"
                    >
                      Update Status
                    </button>
                  </div>
                  <div className="border-t border-zinc-100 pt-4">
                    <h4 className="text-xs font-semibold text-zinc-900 mb-3">Change Password</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newPassword !== confirmPassword) return alert("Passwords do not match.");
                        changePasswordMutation.mutate({ oldPassword, newPassword });
                      }}
                      className="space-y-2"
                    >
                      <input type="password" className="ac-input" placeholder="Current password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                      <input type="password" className="ac-input" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      <input type="password" className="ac-input" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                      <button type="submit" disabled={changePasswordMutation.isPending} className="btn-secondary w-full">
                        {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                      </button>
                    </form>
                  </div>
                  <div className="border-t border-zinc-100 pt-4">
                    <button
                      onClick={() => { if (confirm("Sign out?")) logoutMutation.mutate(); }}
                      disabled={logoutMutation.isPending}
                      className="btn-danger w-full"
                    >
                      {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Create Channel</h3>
              <button onClick={() => setIsChannelModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Channel Name</label>
                <input className="ac-input" placeholder="e.g. design-team" value={newChannelName} onChange={handleChannelNameChange} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Slug</label>
                <input className="ac-input font-mono" value={newChannelSlug} onChange={e => setNewChannelSlug(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                <input className="ac-input" placeholder="What's this channel for?" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Visibility</label>
                <select className="ac-select" value={newChannelType} onChange={e => setNewChannelType(e.target.value)}>
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
