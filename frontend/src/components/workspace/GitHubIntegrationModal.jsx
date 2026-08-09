import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";

export default function GitHubIntegrationModal({ isOpen, onClose }) {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [prNumber, setPrNumber] = useState("42");
  const [prTitle, setPrTitle] = useState("Authentication Refactor & Refresh Tokens");
  const [author, setAuthor] = useState("Alex");
  const [filesChanged, setFilesChanged] = useState("14");
  const [reviewResult, setReviewResult] = useState(null);

  const simulateMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/ai/github-pr`, payload).then((r) => r.data.data),
    onSuccess: (data) => setReviewResult(data),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-zinc-900 text-white">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <h3 className="text-base font-semibold">GitHub PR CollabAI Review</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {!reviewResult ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Simulate an incoming GitHub PR webhook to analyze code changes, check risks, and link tasks.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">PR Number</label>
                  <input className="ac-input text-xs" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Author</label>
                  <input className="ac-input text-xs" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">PR Title</label>
                <input className="ac-input text-xs" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Files Changed</label>
                <input type="number" className="ac-input text-xs" value={filesChanged} onChange={(e) => setFilesChanged(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-secondary h-9 px-3 text-xs">Cancel</button>
                <button
                  onClick={() =>
                    simulateMutation.mutate({
                      prNumber: parseInt(prNumber),
                      title: prTitle,
                      author,
                      filesChanged: parseInt(filesChanged),
                    })
                  }
                  disabled={simulateMutation.isPending}
                  className="btn-primary h-9 px-4 text-xs"
                >
                  {simulateMutation.isPending ? "Analyzing PR..." : "Simulate PR Webhook ✨"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-900 text-white rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400">PR #{reviewResult.prNumber} Review</span>
                  <span className="ac-badge ac-badge-amber">Risk: {reviewResult.riskLevel}</span>
                </div>
                <h4 className="text-sm font-semibold">{reviewResult.title}</h4>
                <p className="text-xs text-zinc-400">Author: @{reviewResult.author} · {reviewResult.filesChanged} files changed</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">✦ CollabAI Analysis</span>
                <div className="space-y-1 bg-zinc-50 border border-border rounded-lg p-3">
                  {reviewResult.aiReview.map((rev, i) => (
                    <p key={i} className="text-xs text-zinc-700 font-medium">
                      • {rev}
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested Actions</span>
                {reviewResult.suggestedTasks.map((t, idx) => (
                  <div key={idx} className="bg-white border border-border rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-800">{t.title}</span>
                    <span className="text-[10px] text-primary font-bold">Assign @{t.assignee}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="btn-primary h-9 px-4 text-xs">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
