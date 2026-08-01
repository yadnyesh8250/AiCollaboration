import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Invitation Form States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [generatedLink, setGeneratedLink] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((res) => res.data.workspace),
    enabled: !!workspaceId,
  });

  const { data: membersData = [], refetch: refetchMembers } = useQuery({
    queryKey: ["workspaceMembersList", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((res) => res.data.members),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "");
      setDescription(workspace.description || "");
    }
  }, [workspace]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: (data) => api.put(`/workspaces/${workspaceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      alert("Settings saved successfully!");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => api.post(`/invites/${workspaceId}`, data),
    onSuccess: (res) => {
      const token = res.data.inviteToken;
      const acceptLink = `${window.location.origin}/invites/accept?token=${token}`;
      setGeneratedLink(acceptLink);
      setInviteEmail("");
      alert("Invitation link generated successfully! Copy it below.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to generate invitation.");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
    onSuccess: () => {
      refetchMembers();
      alert("Member removed successfully.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to remove member.");
    }
  });

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse" />
      </div>
    );
  }

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateWorkspaceMutation.mutate({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col selection:bg-primary/20 selection:text-white">
      <div className="shrink-0">
        <h2 className="text-lg font-bold tracking-tight text-white select-none">Workspace Settings</h2>
        <p className="text-[11px] text-zinc-550 font-medium select-none">Configure general parameters and workspace information</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 max-w-lg min-h-0 pr-1 no-scrollbar">
        {/* General Settings */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-xl border border-zinc-950 bg-[#050505] p-5 space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">General Info</h4>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8.5 w-full rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">Workspace Description</label>
                <textarea
                  placeholder="Workspace description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[70px] rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 py-2 text-xs text-foreground outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block select-none">Workspace Slug</label>
                <input
                  type="text"
                  value={workspace.slug || ""}
                  disabled
                  className="h-8.5 w-full rounded-lg border border-zinc-955 bg-zinc-955/20 px-3 text-xs text-zinc-600 font-mono select-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateWorkspaceMutation.isPending}
              className="h-8 px-4 rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Members & Invites Section */}
        <div className="rounded-xl border border-zinc-955 bg-[#050505] p-5 space-y-5">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">Members & Invitations</h4>
          
          {/* Invite form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
            }}
            className="space-y-3 pb-4 border-b border-zinc-900"
          >
            <p className="text-[10px] font-semibold text-zinc-550 uppercase tracking-wider select-none">Invite employee or team member</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
              >
                <option value="MEMBER">Member (Standard role)</option>
                <option value="ADMIN">Admin (Manage settings)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="h-8 px-4 rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-50 transition-all cursor-pointer"
            >
              {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
            </button>

            {/* Generated Link display */}
            {generatedLink && (
              <div className="mt-3 bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 space-y-2">
                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-500 select-none">
                  <span>INVITATION LINK</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      alert("Invitation link copied to clipboard!");
                    }}
                    className="text-white hover:underline cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full bg-transparent border-none text-[10px] text-zinc-350 font-mono outline-none"
                />
              </div>
            )}
          </form>

          {/* Members List */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest select-none">Active Members</p>
            <div className="space-y-2">
              {membersData.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-950 bg-zinc-950/20"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-6.5 w-6.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center uppercase shrink-0">
                      {m.user?.username?.substring(0, 2) || "AD"}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-zinc-250 truncate">
                        {m.user?.username || m.userId}
                      </p>
                      <p className="text-[9px] text-zinc-650 truncate">{m.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-500 uppercase">
                      {m.role}
                    </span>
                    {m.role !== "OWNER" && m.user?.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${m.user?.username || "this member"} from workspace?`)) {
                            removeMemberMutation.mutate(m.id);
                          }
                        }}
                        disabled={removeMemberMutation.isPending}
                        className="text-[9px] font-bold text-red-500 hover:text-red-400 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
