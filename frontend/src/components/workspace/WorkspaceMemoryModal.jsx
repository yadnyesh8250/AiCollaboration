import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";

export default function WorkspaceMemoryModal({ isOpen, onClose }) {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["workspaceMemories", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/ai/memories`).then((r) => r.data.data),
    enabled: !!workspaceId && isOpen,
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/ai/memories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceMemories", workspaceId] });
      setKey("");
      setValue("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (memId) => api.delete(`/workspaces/${workspaceId}/ai/memories/${memId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceMemories", workspaceId] });
    },
  });

  if (!isOpen) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    addMutation.mutate({ key: key.trim(), value: value.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-violet-50 via-white to-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-sm">
              🧠
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Workspace Memory Vault</h3>
              <p className="text-xs text-zinc-500">Long-term team rules & architectural memory auto-used by CollabAI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700">✕</button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Add form */}
          <form onSubmit={handleAdd} className="bg-zinc-50 border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-800">Add Team Rule / Architectural Memory</p>
            <div className="space-y-2">
              <input
                className="ac-input text-xs"
                placeholder="Key (e.g. Auth Standard, Database, Review Process)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
              <textarea
                className="ac-textarea text-xs"
                rows={2}
                placeholder="Value (e.g. Authentication uses refresh-token rotation with MySQL database)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="btn-primary h-8 px-3 text-xs"
              >
                {addMutation.isPending ? "Saving..." : "Save to Memory +"}
              </button>
            </div>
          </form>

          {/* Memories list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stored Workspace Facts ({memories.length})</p>
            {isLoading ? (
              <p className="text-xs text-zinc-400">Loading memories...</p>
            ) : memories.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-border rounded-xl">
                <p className="text-xs text-zinc-400">No workspace memories saved yet. Add key architectural rules above!</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl bg-white">
                {memories.map((m) => (
                  <div key={m.id} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <span className="ac-badge ac-badge-teal mb-1 inline-block">{m.key}</span>
                      <p className="text-xs text-zinc-700 font-medium leading-relaxed">{m.value}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      className="text-xs text-red-400 hover:text-red-600 p-1"
                      title="Delete memory"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
