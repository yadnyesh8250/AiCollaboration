import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // 1. Fetch User Organizations
  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.get("/organizations").then((res) => res.data.organizations),
  });

  // 2. Fetch User Workspaces (using active org if any, or flat user workspaces if api supported it)
  // Let's query workspaces for all organizations the user is a member of
  const activeOrgId = orgs[0]?.id;
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery({
    queryKey: ["workspaces", activeOrgId],
    queryFn: () => api.get(`/organizations/${activeOrgId}/workspaces`).then((res) => res.data.workspaces),
    enabled: !!activeOrgId,
  });

  // 3. Fetch User Pending Invites
  const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["pendingInvites"],
    queryFn: () => api.get("/invites/pending").then((res) => res.data.invites),
  });

  // 4. Accept Invite Mutation
  const acceptInviteMutation = useMutation({
    mutationFn: (token) => api.post("/invites/accept", { token }),
    onSuccess: (res) => {
      alert("Successfully accepted invitation and joined workspace!");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      
      // If we got joined workspace details, navigate directly
      if (res.data.workspaceId) {
        navigate(`/workspaces/${res.data.workspaceId}`);
      } else {
        // Fallback: reload page/data
        window.location.reload();
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to accept invite. Check if the token is valid.");
    }
  });

  // 5. Join workspace by invite token input
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

  const isDataLoading = loadingOrgs || (activeOrgId && loadingWorkspaces) || loadingInvites;

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="text-sm font-semibold text-zinc-900">A-Collab Workspace Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 font-medium">Logged in as {user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        {isDataLoading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-zinc-400 font-medium">Loading workspaces...</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white border border-border rounded-2xl shadow-xl p-8 space-y-8 animate-in fade-in duration-200">
            
            {/* Header Greeting */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-900">Welcome to A-Collab</h2>
              <p className="text-sm text-zinc-500">Choose a workspace to enter, join an existing one, or register your organization.</p>
            </div>

            {/* Workspace Selector (If workspaces exist) */}
            {workspaces.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Workspaces</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspaces.map((w) => (
                    <Link
                      key={w.id}
                      to={`/workspaces/${w.id}`}
                      className="p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-3 bg-white"
                    >
                      <div className="h-8 w-8 rounded-lg bg-accent text-primary font-bold text-sm flex items-center justify-center">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{w.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{orgs[0]?.name || "Organization"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-center space-y-1">
                <p className="text-sm font-medium text-zinc-700">No workspaces found</p>
                <p className="text-xs text-zinc-450">You are not added to any workspaces yet. Create one below or request access.</p>
              </div>
            )}

            {/* Pending Invitations list */}
            {pendingInvites.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Invitations</h3>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800">
                          Workspace: {invite.workspace?.name}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Invited by @{invite.invitedBy?.username} to {invite.workspace?.organization?.name}
                        </p>
                      </div>
                      <button
                        onClick={() => acceptInviteMutation.mutate(invite.token)}
                        disabled={acceptInviteMutation.isPending}
                        className="h-8 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Accept & Join
                      </button>
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
                <h4 className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Join a Workspace</h4>
                <form onSubmit={handleJoinByToken} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter Invite Token..."
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
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
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
