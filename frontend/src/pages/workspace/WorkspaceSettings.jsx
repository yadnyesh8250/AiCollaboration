import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((res) => res.data.workspace),
    enabled: !!workspaceId,
  });

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Settings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Manage details and configure workspace parameters</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-w-xl min-h-0 pr-1">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-zinc-300">General Information</h4>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Workspace Name</label>
              <input
                type="text"
                defaultValue={workspace.name}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Workspace Slug</label>
              <input
                type="text"
                defaultValue={workspace.slug}
                disabled
                className="h-10 w-full rounded-lg border border-zinc-850 bg-zinc-900/30 px-3 text-sm text-zinc-500 font-mono"
              />
            </div>
          </div>
        </div>

        <button className="h-10 px-4 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
          Save Changes
        </button>
      </div>
    </div>
  );
}
