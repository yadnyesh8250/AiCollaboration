import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";

export default function SprintPlannerModal({ isOpen, onClose }) {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("Authentication and Token Rotation Sprint");
  const [sprintProposal, setSprintProposal] = useState(null);

  const generateMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/ai/sprint-plan`, payload).then((r) => r.data.data),
    onSuccess: (data) => setSprintProposal(data),
  });

  const createSprintTasksMutation = useMutation({
    mutationFn: async () => {
      if (!sprintProposal) return;
      // 1. Create tasks
      for (const t of sprintProposal.tasks) {
        await api.post(`/workspaces/${workspaceId}/tasks`, {
          title: t.title,
          description: t.description,
          priority: t.priority || "HIGH",
          estimatedHours: t.estimatedHours,
          status: "TODO",
        });
      }
      // 2. Create sprint
      await api.post(`/workspaces/${workspaceId}/sprints`, {
        name: sprintProposal.sprintName,
        goal: `Generated from prompt: ${prompt}`,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["sprints", workspaceId] });
      alert("Sprint and Tasks created successfully!");
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-zinc-900">AI Sprint Planner</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!sprintProposal ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Sprint Goal / Directive</label>
                <textarea
                  rows={3}
                  className="ac-textarea text-sm"
                  placeholder="Describe what your team needs to ship next week..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-secondary h-9 px-4 text-xs">Cancel</button>
                <button
                  onClick={() => generateMutation.mutate({ goalPrompt: prompt })}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="btn-primary h-9 px-4 text-xs"
                >
                  {generateMutation.isPending ? "Generating Sprint..." : "Generate Sprint Proposal ✨"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-accent/50 border border-primary/20 rounded-xl p-4 space-y-1">
                <p className="text-xs text-primary font-bold uppercase tracking-wider">Proposed Sprint</p>
                <h4 className="text-base font-bold text-zinc-900">{sprintProposal.sprintName}</h4>
                <p className="text-xs text-zinc-500">Duration: 1 Week · Est. {sprintProposal.estimatedTotalHours || 20} Total Hours</p>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Proposed Tasks ({sprintProposal.tasks?.length || 0})</p>
                {sprintProposal.tasks?.map((t, idx) => (
                  <div key={idx} className="bg-zinc-50 border border-border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{t.title}</p>
                      <p className="text-xs text-zinc-400">{t.description}</p>
                    </div>
                    <span className="ac-badge ac-badge-teal">{t.estimatedHours || 4}h</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <button onClick={() => setSprintProposal(null)} className="btn-secondary h-9 px-3 text-xs">
                  Back
                </button>
                <button
                  onClick={() => createSprintTasksMutation.mutate()}
                  disabled={createSprintTasksMutation.isPending}
                  className="btn-primary h-9 px-4 text-xs"
                >
                  {createSprintTasksMutation.isPending ? "Creating..." : "Create Sprint & Tasks →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
