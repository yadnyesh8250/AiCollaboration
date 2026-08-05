import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";

export default function WorkspaceHome() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();

  // Dynamic Greeting based on time
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good Morning");
    else if (hrs < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Queries
  // ───────────────────────────────────────────────────────────────────────────
  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((res) => res.data.members),
    enabled: !!workspaceId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["workspaceTasks", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((res) => res.data.tasks),
    enabled: !!workspaceId,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["workspaceDocsList", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/documents`).then((res) => res.data.documents),
    enabled: !!workspaceId,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channelsList", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  // Calculate onboarding milestones
  const milestones = [
    { label: "Invite teammates", description: "Bring in collaborators or employees", complete: members.length > 1 },
    { label: "Create your first task", description: "Populate the workspace kanban backlog", complete: tasks.length > 0 },
    { label: "Send first message", description: "Query AI or drop a text in #general", complete: true }, // Defaults true for general channel
    { label: "Create first document", description: "Write notes or wikis in Notion docs", complete: docs.length > 0 },
  ];

  const completedCount = milestones.filter((m) => m.complete).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  // Simulated active feed of events to make workspace feel alive
  const [activeEvents, setActiveEvents] = useState([
    { id: 1, text: "CollabAI completed summary of sprint backlog", time: "Just now", type: "ai" },
    { id: 2, text: `${user?.username || "You"} logged into organization workspace`, time: "2m ago", type: "log" },
    { id: 3, text: "Sarah J. moved TASK-13 'Finalize UI Design' to completed", time: "10m ago", type: "task" },
    { id: 4, text: "DocBot generated template wiki 'Product Design Spec'", time: "1h ago", type: "docs" },
  ]);

  // Append simulated logs dynamically over time to look alive
  useEffect(() => {
    const liveSimulationLog = [
      "Alex Connor typing in #development...",
      "Deployment pipeline successfully verified: frontend build output complete",
      "Task-42 priority reassessed by CollabAI (Medium ➔ High)",
      "Mike accepted invite to organization workspace",
      "General channel activity summary compiled by CollabAI"
    ];

    const interval = setInterval(() => {
      const randomLog = liveSimulationLog[Math.floor(Math.random() * liveSimulationLog.length)];
      setActiveEvents((prev) => [
        { id: Date.now(), text: randomLog, time: "Just now", type: "sim" },
        ...prev.slice(0, 5) // Cap list length
      ]);
    }, 15000); // Trigger every 15s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-y-auto no-scrollbar selection:bg-primary/20 selection:text-white">
      {/* Header Greeting */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white select-none">
            {greeting}, {user?.firstName || user?.username || "Yadnyesh"} 👋
          </h2>
          <p className="text-[11px] text-zinc-550 font-medium select-none">
            Welcome to A-Collab. Here is your team activity and product health dashboard.
          </p>
        </div>
        <div className="text-[9px] font-mono border border-zinc-900 bg-zinc-950 px-2.5 py-1 rounded text-zinc-500 select-none">
          LOCAL TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Left Columns (Onboarding & Quick stats) */}
        <div className="xl:col-span-2 space-y-5">
          {/* Onboarding Checklist Widget */}
          <div className="rounded-xl border border-zinc-955 bg-[#050505] p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-[circle_at_top_right,rgba(255,255,255,0.01),transparent_60%] pointer-events-none" />
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider select-none">Workspace Checklist</h4>
                <p className="text-[10px] text-zinc-650 font-medium select-none">Complete these core setup milestones to unlock team workflow</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-white">{progressPercent}%</span>
                <span className="text-[9px] text-zinc-600 block font-bold select-none">COMPLETE</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-white transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1.5 relative z-10">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-955 bg-zinc-950/20"
                >
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center border text-[9px] font-black shrink-0 ${
                    m.complete 
                      ? "bg-emerald-950/25 border-emerald-900/60 text-emerald-450"
                      : "border-zinc-900 text-zinc-600 bg-zinc-950/20"
                  }`}>
                    {m.complete ? "✓" : idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-zinc-300 truncate">{m.label}</p>
                    <p className="text-[9px] text-zinc-600 truncate">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Today's Tasks */}
            <div className="rounded-xl border border-zinc-955 bg-[#050505] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">Active Tasks</h4>
                <Link to="tasks" className="text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider">
                  View Kanban →
                </Link>
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-zinc-600 italic select-none">No active tasks created yet.</div>
                ) : (
                  tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-3 rounded-lg border border-zinc-955 bg-zinc-955/10 flex justify-between items-center">
                      <div className="overflow-hidden space-y-0.5">
                        <p className="text-xs font-bold text-zinc-300 truncate">{task.title}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">{task.status}</p>
                      </div>
                      <span className="text-[9px] bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-550 select-none uppercase font-bold">
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="rounded-xl border border-zinc-955 bg-[#050505] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest select-none">Wiki & Docs</h4>
                <Link to="docs" className="text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider">
                  Open Notion →
                </Link>
              </div>

              <div className="space-y-2">
                {docs.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-zinc-600 italic select-none">No documents created yet.</div>
                ) : (
                  docs.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="p-3 rounded-lg border border-zinc-955 bg-zinc-955/10 flex justify-between items-center">
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-zinc-300 truncate">{doc.title}</p>
                        <p className="text-[9px] text-zinc-650 truncate mt-0.5">Last updated: {new Date(doc.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase select-none">Notion</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns (AI Summary & Telemetry events feed) */}
        <div className="space-y-5">
          {/* CollabAI Welcome Teammate Card */}
          <div className="rounded-xl border border-purple-950 bg-gradient-to-br from-purple-950/5 via-[#050505] to-[#050505] p-5 space-y-4 shadow-sm relative overflow-hidden">
            {/* Purple glow backdrop */}
            <div className="absolute inset-0 bg-radial-[circle_at_top_left,rgba(168,85,247,0.025),transparent_60%] pointer-events-none" />
            
            <div className="flex items-center gap-2 relative z-10 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">CollabAI Assistant</span>
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-xs font-bold text-zinc-350 leading-relaxed">
                Hi, I'm CollabAI. Here is what I noticed in your workspace:
              </p>
              <div className="space-y-1.5 pl-1 pt-1 text-[10px] text-zinc-400 font-medium">
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">✦</span> Active sprint: {tasks.filter(t => t.status === "IN_PROGRESS").length} tasks currently in progress.
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">✦</span> Backlog status: {tasks.length} total tasks are recorded in board backlog.
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-400">✦</span> Wiki logs: {docs.length} workspace documentation pages created.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                alert("AI assistant session initiated. Ask anything inside the right Copilot panel!");
              }}
              className="w-full h-8.5 rounded-lg border border-purple-900/35 bg-purple-950/15 hover:bg-purple-950/25 text-[10px] font-bold text-purple-400 transition-all cursor-pointer relative z-10"
            >
              Ask Copilot for Details
            </button>
          </div>

          {/* Live Activity Telemetry Logs */}
          <div className="rounded-xl border border-zinc-955 bg-[#050505] p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Live Telemetry</h4>
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-3 font-mono">
              {activeEvents.map((evt) => (
                <div key={evt.id} className="text-[10px] flex justify-between gap-3 items-start leading-relaxed p-2.5 rounded-lg border border-zinc-955 bg-zinc-950/30 select-none animate-in fade-in duration-200">
                  <span className={`font-semibold ${
                    evt.type === "ai" ? "text-purple-450" : 
                    evt.type === "task" ? "text-zinc-350" : "text-zinc-550"
                  }`}>
                    &gt; {evt.text}
                  </span>
                  <span className="text-zinc-650 shrink-0 text-[9px]">{evt.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
