import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((res) => res.data.workspace),
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
    },
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
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Settings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Manage details and configure workspace parameters</p>
      </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 max-w-xl min-h-0 pr-1">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-zinc-300">General Information</h4>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Workspace Description</label>
              <textarea
                placeholder="Workspace description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Workspace Slug</label>
              <input
                type="text"
                value={workspace.slug || ""}
                disabled
                className="h-10 w-full rounded-lg border border-zinc-850 bg-zinc-900/30 px-3 text-sm text-zinc-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateWorkspaceMutation.isPending}
            className="h-10 px-4 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 transition-all cursor-pointer"
          >
            {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {updateWorkspaceMutation.isSuccess && (
            <span className="text-xs text-emerald-500 font-medium">Changes saved successfully!</span>
          )}
        </div>
      </form>
    </div>
  );
}
