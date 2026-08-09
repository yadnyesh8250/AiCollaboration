import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";

export default function MeetingToWorkflowModal({ isOpen, onClose }) {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [meetingTitle, setMeetingTitle] = useState("Engineering Sync Notes");
  const [transcript, setTranscript] = useState(
    "We decided to migrate authentication to refresh-token rotation.\nAlex will implement the backend by Friday.\nSarah will update the frontend login flow.\nMike will write the security documentation."
  );
  const [resultData, setResultData] = useState(null);

  const pipelineMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/ai/meeting-pipeline`, payload).then((r) => r.data),
    onSuccess: (res) => {
      setResultData(res.data);
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    pipelineMutation.mutate({
      meetingTitle: meetingTitle.trim(),
      transcript: transcript.trim(),
    });
  };

  const handleReset = () => {
    setResultData(null);
    setTranscript("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-teal-50/50 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-base font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">AI Meeting → Tasks → Docs</h3>
              <p className="text-xs text-zinc-500">Auto-convert meeting notes into tasks, sprint updates & documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {!resultData ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Meeting Title</label>
                <input
                  type="text"
                  required
                  className="ac-input text-sm"
                  placeholder="e.g. Architecture Alignment Sync"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-700">Paste Meeting Transcript or Notes</label>
                  <button
                    type="button"
                    onClick={() =>
                      setTranscript(
                        "We decided to migrate authentication to refresh-token rotation.\nAlex will implement the backend by Friday.\nSarah will update the frontend login flow.\nMike will write the security documentation."
                      )
                    }
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Load Sample Script
                  </button>
                </div>
                <textarea
                  required
                  rows={7}
                  className="ac-textarea text-sm font-mono leading-relaxed"
                  placeholder="Paste raw notes, decisions, or raw transcript..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>

              {/* Step indicator preview */}
              <div className="bg-zinc-50 border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-700">Automated CollabAI Workflow Actions:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">✓ Extract Decisions & Action Items</div>
                  <div className="flex items-center gap-2">✓ Create Tasks in Kanban Backlog</div>
                  <div className="flex items-center gap-2">✓ Assign to Active Sprint</div>
                  <div className="flex items-center gap-2">✓ Generate Document Specs Page</div>
                  <div className="flex items-center gap-2">✓ Notify Assigned Members</div>
                  <div className="flex items-center gap-2">✓ Real-time Socket Broadcast</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary h-10 px-4 text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pipelineMutation.isPending || !transcript.trim()}
                  className="btn-primary h-10 px-5 text-sm flex items-center gap-2"
                >
                  {pipelineMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing Workflow...
                    </>
                  ) : (
                    <>
                      <span>✨ Run AI Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results View */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900">Pipeline Executed Successfully!</h4>
                  <p className="text-xs text-emerald-700">
                    Created {resultData.tasks.length} task(s), updated documentation page, and notified assigned members.
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white border border-border rounded-xl p-4 space-y-1.5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Executive Summary</span>
                <p className="text-sm text-zinc-800 font-medium leading-relaxed">{resultData.summary}</p>
              </div>

              {/* Decisions */}
              {resultData.decisions && resultData.decisions.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Decisions Agreed</span>
                  <div className="space-y-1">
                    {resultData.decisions.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-zinc-700 font-medium">
                        <span className="text-primary font-bold">✓</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Tasks */}
              <div className="bg-white border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Auto-Created Tasks ({resultData.tasks.length})</span>
                  {resultData.activeSprint && (
                    <span className="ac-badge ac-badge-teal">Linked to {resultData.activeSprint}</span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {resultData.tasks.map((task) => (
                    <div key={task.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 truncate">{task.title}</p>
                        <p className="text-xs text-zinc-400">
                          {task.assignee ? `Assigned to @${task.assignee.username}` : "Unassigned"}
                          {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                      <span className="ac-badge ac-badge-gray">{task.priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2">
                <button onClick={handleReset} className="btn-secondary h-9 px-4 text-xs">
                  Process Another Meeting
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/workspaces/${workspaceId}/tasks`);
                    }}
                    className="btn-secondary h-9 px-4 text-xs"
                  >
                    View Task Board →
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/workspaces/${workspaceId}/docs`);
                    }}
                    className="btn-primary h-9 px-4 text-xs"
                  >
                    Open Created Document →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
