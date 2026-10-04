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
      <div className="p-space-lg max-w-4xl mx-auto w-full">
        <div className="h-6 w-48 bg-surface-container-high rounded animate-pulse" />
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
    <div className="h-full overflow-y-auto bg-surface-ws select-none">
      <div className="p-space-lg max-w-4xl mx-auto w-full space-y-space-lg pb-16">
        
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Workspace Settings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Configure general parameters and workspace members</p>
        </div>

        {/* General Info */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>tune</span>
              <h2 className="text-body-md font-semibold text-on-surface">General Information</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant block">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-outline-variant/40 bg-white px-3 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant block">Workspace Description</label>
                <textarea
                  placeholder="Describe the purpose of this workspace..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[80px] rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-on-surface-variant block">Workspace Slug</label>
                <input
                  type="text"
                  value={workspace.slug || ""}
                  disabled
                  className="h-9 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 text-body-sm text-on-surface-variant font-mono select-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updateWorkspaceMutation.isPending}
                className="h-9 px-5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-body-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
              >
                {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>

        {/* Members & Invites Section */}
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>group</span>
            <h2 className="text-body-md font-semibold text-on-surface">Members & Invitations</h2>
          </div>
          
          {/* Invite form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
            }}
            className="space-y-3 pb-6 border-b border-surface-container"
          >
            <p className="text-body-sm font-medium text-on-surface">Invite new team member</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 rounded-lg border border-outline-variant/40 bg-white px-3 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 rounded-lg border border-outline-variant/40 bg-white px-3 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                <option value="MEMBER">Member (Standard role)</option>
                <option value="ADMIN">Admin (Manage settings)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="h-9 px-5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-body-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
            >
              {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
            </button>

            {/* Generated Link display */}
            {generatedLink && (
              <div className="mt-3 bg-surface-container-low border border-outline-variant/30 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-label-sm font-semibold text-on-surface-variant">
                  <span>INVITATION LINK</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      alert("Invitation link copied to clipboard!");
                    }}
                    className="text-primary hover:underline cursor-pointer font-medium"
                  >
                    Copy Link
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full bg-white border border-outline-variant/30 rounded px-2.5 py-1 text-label-sm text-on-surface font-mono outline-none"
                />
              </div>
            )}
          </form>

          {/* Members List */}
          <div className="space-y-3">
            <p className="text-body-sm font-medium text-on-surface">Active Members ({membersData.length})</p>
            <div className="space-y-2">
              {membersData.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center uppercase shrink-0">
                      {m.user?.firstName?.[0] || m.user?.username?.substring(0, 2) || "U"}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-body-sm font-medium text-on-surface truncate">
                        {m.user?.firstName && m.user?.lastName ? `${m.user.firstName} ${m.user.lastName}` : m.user?.username || m.userId}
                      </p>
                      <p className="text-label-sm text-on-surface-variant truncate">{m.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-label-sm font-mono bg-surface-container-high border border-outline-variant/30 px-2 py-0.5 rounded text-on-surface-variant uppercase font-medium">
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
                        className="text-label-sm font-medium text-destructive hover:underline cursor-pointer"
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
