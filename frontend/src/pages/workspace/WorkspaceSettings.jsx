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
      alert("Settings saved successfully!");
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
    <div className="p-6 space-y-6 h-full flex flex-col selection:bg-primary/20 selection:text-white">
      <div className="shrink-0">
        <h2 className="text-lg font-bold tracking-tight text-white select-none">Workspace Settings</h2>
        <p className="text-[11px] text-zinc-550 font-medium select-none">Configure general parameters and workspace information</p>
      </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 max-w-lg min-h-0 pr-1 no-scrollbar">
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
                className="h-8.5 w-full rounded-lg border border-zinc-950 bg-zinc-950/20 px-3 text-xs text-zinc-600 font-mono select-none"
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
    </div>
  );
}
