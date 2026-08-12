import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";
import aCollabLogo from "../../assets/logo.png";
import ThreeCanvas from "../../components/auth/ThreeCanvas";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // 1. Fetch User Flat Workspaces (Includes parent org details, user roles, and member counts)
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery({
    queryKey: ["allWorkspaces"],
    queryFn: () => api.get("/workspaces").then((res) => res.data.workspaces || []),
  });

  // 2. Fetch User Pending Invites
  const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["pendingInvites"],
    queryFn: () => api.get("/invites/pending").then((res) => res.data.invites || []),
  });

  // 3. Accept Invite Mutation
  const acceptInviteMutation = useMutation({
    mutationFn: (token) => api.post("/invites/accept", { token }),
    onSuccess: (res) => {
      alert("Successfully accepted invitation and joined workspace!");
      queryClient.invalidateQueries({ queryKey: ["allWorkspaces"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      
      if (res.data.workspaceId) {
        navigate(`/workspaces/${res.data.workspaceId}`);
      } else {
        window.location.reload();
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to accept invite. Check if the token is valid.");
    }
  });

  // 4. Decline Invite Mutation
  const declineInviteMutation = useMutation({
    mutationFn: (token) => api.post("/invites/decline", { token }),
    onSuccess: () => {
      alert("Successfully declined the invitation.");
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to decline invitation.");
    }
  });

  // 5. Join workspace by token input
  const handleJoinByToken = async (e) => {
    e.preventDefault();
    if (!inviteTokenInput.trim()) return;
    setIsJoining(true);
    acceptInviteMutation.mutate(inviteTokenInput.trim(), {
      onSettled: () => setIsJoining(false)
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const isDataLoading = loadingWorkspaces || loadingInvites;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-primary/20 selection:text-white">
      {/* Top Navbar */}
      <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <img src={aCollabLogo} alt="A-Collab Logo" className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold text-zinc-900">A-Collab Workspace Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-550 font-medium">Logged in as {user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background layer */}
        <ThreeCanvas />

        {isDataLoading ? (
          <div className="flex flex-col items-center space-y-3 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-zinc-400 font-medium animate-pulse">Loading workspaces...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white/75 backdrop-blur-md border border-zinc-200/80 rounded-2xl shadow-xl p-8 space-y-8 animate-in fade-in duration-200 relative z-10">
            
            {/* Header Greeting */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-900">Welcome back, {user?.username}</h2>
              <p className="text-sm text-zinc-500">Choose a workspace to enter, join an existing one, or register your organization.</p>
            </div>

            {/* Workspace Selector (If workspaces exist) */}
            {workspaces.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">Your Workspaces</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspaces.map((w) => (
                    <Link
                      key={w.id}
                      to={`/workspaces/${w.id}`}
                      className="p-4 rounded-xl border border-zinc-200 hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between gap-3 bg-white group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 text-zinc-700 border border-zinc-200 font-bold text-sm flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-all">
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate group-hover:text-zinc-900">{w.name}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {w.organization?.name || "Organization"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200/50">
                          {w.role}
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {w.memberCount || 1} member{w.memberCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-center space-y-1 select-none">
                <p className="text-sm font-medium text-zinc-700">No workspaces found</p>
                <p className="text-xs text-zinc-400">You are not added to any workspaces yet. Create one below or request access.</p>
              </div>
            )}

            {/* Pending Invitations list */}
            {pendingInvites.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">Pending Invitations</h3>
                <div className="space-y-2.5">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-800 truncate">
                            Workspace: {invite.workspace?.name}
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100/60 text-amber-800 border border-amber-200/30 shrink-0">
                            {invite.role}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Invited by <span className="font-semibold text-zinc-700">@{invite.invitedBy?.username}</span> to <span className="font-semibold text-zinc-700">{invite.workspace?.organization?.name}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => declineInviteMutation.mutate(invite.token)}
                          disabled={declineInviteMutation.isPending || acceptInviteMutation.isPending}
                          className="h-8 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-650 text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptInviteMutation.mutate(invite.token)}
                          disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                          className="h-8 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-px bg-zinc-150" />

            {/* Action Panel: Join / Create */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Join Workspace Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-455 uppercase tracking-wider">Join Workspace with Token</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Enter the invitation token received from your workspace administrator to accept your invite.
                </p>
                <form onSubmit={handleJoinByToken} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8f9c2d1b7a..."
                    value={inviteTokenInput}
                    onChange={(e) => setInviteTokenInput(e.target.value)}
                    className="ac-input flex-1 h-9 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="btn-primary h-9 px-4 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    {isJoining ? "Joining..." : "Join"}
                  </button>
                </form>
              </div>

              {/* Create Organization link */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-455 uppercase tracking-wider">Start Something New</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Set up a new organization and workspaces to invite your teammates and collaborate.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link
                    to="/create-org"
                    className="btn-secondary h-9 text-xs flex items-center justify-center flex-1 font-semibold"
                  >
                    Create Organization
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
