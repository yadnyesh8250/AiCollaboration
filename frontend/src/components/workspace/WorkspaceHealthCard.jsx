import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceHealthCard({ onOpenMeetingModal }) {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["workspaceHealth", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/ai/health`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["proactiveAlerts", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/ai/alerts`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  if (healthLoading || !healthData) {
    return (
      <div className="bg-white border border-border rounded-xl p-5 animate-pulse space-y-3">
        <div className="h-4 bg-zinc-100 rounded w-1/3" />
        <div className="h-8 bg-zinc-100 rounded w-1/2" />
      </div>
    );
  }

  const { overallScore, statusLabel, metrics, insights } = healthData;

  const scoreColor =
    overallScore >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    overallScore >= 65 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <div className="space-y-4">
      {/* ── Proactive AI Alerts Banner ── */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Proactive AI Insight Detected
              </span>
            </div>
            <span className="text-xs text-amber-700 font-medium">Auto-scanned</span>
          </div>

          {alerts.map((alert) => (
            <div key={alert.id} className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{alert.title}</p>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{alert.description}</p>
              </div>

              <div className="flex gap-2 pt-1">
                {alert.actions.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (act.type === "NAVIGATE_TASKS") navigate(`/workspaces/${workspaceId}/tasks`);
                      else if (act.type === "NAVIGATE_DOCS") navigate(`/workspaces/${workspaceId}/docs`);
                      else if (act.type === "CREATE_DOC" && onOpenMeetingModal) onOpenMeetingModal();
                      else alert("Notified task owners.");
                    }}
                    className="h-7 px-3 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    {act.label} →
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Health Score Breakdown ── */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Workspace Health Score</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Real-time collaboration velocity & documentation alignment</p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold px-3.5 py-1 rounded-xl border ${scoreColor}`}>
              {overallScore}
            </span>
            <div>
              <p className="text-xs font-bold text-zinc-900">{statusLabel}</p>
              <p className="text-[10px] text-zinc-400">Out of 100</p>
            </div>
          </div>
        </div>

        {/* Metric Progress Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Communication", value: metrics.communication, color: "bg-teal-500" },
            { label: "Task Progress", value: metrics.taskProgress, color: "bg-blue-500" },
            { label: "Sprint Health", value: metrics.sprintHealth, color: "bg-amber-500" },
            { label: "Documentation", value: metrics.documentation, color: "bg-violet-500" },
            { label: "Team Activity", value: metrics.teamActivity, color: "bg-emerald-500" },
          ].map((m) => (
            <div key={m.label} className="bg-zinc-50 border border-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium text-[11px]">{m.label}</span>
                <span className="font-bold text-zinc-800">{m.value}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div className={`h-full ${m.color} transition-all duration-700`} style={{ width: `${m.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Health Diagnostics */}
        <div className="space-y-1.5 pt-1 border-t border-border">
          <p className="text-xs font-semibold text-zinc-500">AI Diagnostics:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((ins, i) => (
              <p key={i} className="text-xs text-zinc-700 font-medium flex items-center gap-1.5">
                {ins}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
