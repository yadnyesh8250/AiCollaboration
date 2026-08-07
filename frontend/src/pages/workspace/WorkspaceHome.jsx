import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";

export default function WorkspaceHome() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { activeRightPanel, setRightPanel } = useUIStore();

  // Dynamic Greeting based on time
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good Morning");
    else if (hrs < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Quick Action Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  
  const [docTitle, setDocTitle] = useState("");

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

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => {
      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
    }
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/documents`, data),
    onSuccess: () => {
      setIsDocModalOpen(false);
      setDocTitle("");
      queryClient.invalidateQueries({ queryKey: ["workspaceDocsList", workspaceId] });
    }
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      status: "TODO",
      position: tasks.length * 1000 + 1000
    });
  };

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    createDocMutation.mutate({
      title: docTitle.trim(),
      visibility: "WORKSPACE"
    });
  };

  // Calculate onboarding milestones
  const milestones = [
    { label: "Invite teammates", description: "Bring in collaborators or employees", complete: members.length > 1 },
    { label: "Create your first task", description: "Populate the workspace kanban backlog", complete: tasks.length > 0 },
    { label: "Send first message", description: "Query AI or drop a text in #general", complete: true },
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

  // Calendar mapping logic
  const getCalendarDays = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad previous month days
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      days.push(null);
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-y-auto no-scrollbar selection:bg-primary/20 selection:text-white">
      
      {/* Header Greeting */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground select-none">
            {greeting}, {user?.firstName || user?.username || "Yadnyesh"} 👋
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium select-none">
            Welcome to A-Collab. Redesigning workspace collaboration.
          </p>
        </div>
        
        {/* Quick Action Button Panel */}
        <div className="flex items-center gap-2 select-none">
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-zinc-50 text-[10px] font-bold text-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>📋</span> Create Task
          </button>
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-zinc-50 text-[10px] font-bold text-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>📚</span> Write Doc
          </button>
          <button
            onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
            className="h-8 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-[10px] font-bold text-primary cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>🤖</span> Ask AI
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        
        {/* Left Columns (Onboarding & Quick stats) */}
        <div className="xl:col-span-2 space-y-5">
          {/* Onboarding Checklist Widget */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-[circle_at_top_right,rgba(99,102,241,0.015),transparent_60%] pointer-events-none" />
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider select-none">Workspace Setup Checklist</h4>
                <p className="text-[10px] text-zinc-500 font-medium select-none">Complete these core setup milestones to unlock team workflow</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-primary">{progressPercent}%</span>
                <span className="text-[9px] text-zinc-400 block font-bold select-none">COMPLETE</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-zinc-100 border border-zinc-200 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1.5 relative z-10">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
                >
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center border text-[9px] font-black shrink-0 ${
                    m.complete 
                      ? "bg-emerald-50 border-emerald-250 text-white"
                      : "border-zinc-300 text-zinc-400 bg-zinc-50"
                  }`}>
                    {m.complete ? "✓" : idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-zinc-700 truncate">{m.label}</p>
                    <p className="text-[9px] text-zinc-500 truncate">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Calendar Widget */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Calendar — {monthName}</h4>
              <span className="text-[9px] font-bold text-zinc-400">TODAY'S TASKS SCHEDULE</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold text-zinc-450 border-b border-border pb-1 select-none">
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
            
            <div className="grid grid-cols-7 gap-1 pt-1 font-mono text-[10px]">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} className="h-9 bg-zinc-50/20 rounded" />;
                
                const isToday = day.getDate() === new Date().getDate();
                
                // Check if any tasks are due on this day
                const dueTasks = tasks.filter((t) => {
                  if (!t.dueDate) return false;
                  const dDate = new Date(t.dueDate);
                  return dDate.getDate() === day.getDate() && dDate.getMonth() === day.getMonth();
                });

                return (
                  <div
                    key={idx}
                    className={`h-9 rounded border relative flex flex-col justify-between p-1 group/day hover:bg-zinc-150 transition-colors ${
                      isToday ? "border-primary bg-primary/5 text-primary" : "border-border bg-background"
                    }`}
                  >
                    <span className="font-bold select-none">{day.getDate()}</span>
                    
                    {dueTasks.length > 0 && (
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mx-auto" />
                    )}

                    {/* Hover tooltip for due tasks */}
                    {dueTasks.length > 0 && (
                      <div className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 bg-zinc-900 text-white rounded p-2 text-[9px] leading-relaxed shadow-lg w-[140px] pointer-events-none opacity-0 group-hover/day:opacity-100 transition-opacity z-50">
                        <p className="font-bold border-b border-zinc-800 pb-0.5 mb-1 uppercase tracking-wider text-amber-400">Due Tasks:</p>
                        {dueTasks.map((t) => (
                          <p key={t.id} className="truncate">• {t.title}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Columns (AI Summary & Telemetry events feed) */}
        <div className="space-y-5">
          {/* CollabAI Welcome Teammate Card */}
          <div className="rounded-xl border border-purple-250 bg-gradient-to-br from-purple-50/25 via-card to-card p-5 space-y-4 shadow-xs relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-[circle_at_top_left,rgba(168,85,247,0.015),transparent_60%] pointer-events-none" />
            
            <div className="flex items-center gap-2 relative z-10 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-purple-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600">CollabAI Assistant</span>
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-xs font-bold text-zinc-650 leading-relaxed">
                Hi, I'm CollabAI. Here is what I noticed in your workspace:
              </p>
              <div className="space-y-1.5 pl-1 pt-1 text-[10px] text-zinc-500 font-semibold">
                <p className="flex items-center gap-2">
                  <span className="text-purple-500">✦</span> Active tasks: {tasks.filter(t => t.status === "IN_PROGRESS").length} tasks in progress.
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-500">✦</span> Backlog status: {tasks.length} total tasks are recorded.
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-purple-500">✦</span> Documentation logs: {docs.length} documentation pages created.
                </p>
              </div>
            </div>

            <button
              onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
              className="w-full h-8.5 rounded-lg border border-purple-200 bg-purple-50/20 hover:bg-purple-50/40 text-[10px] font-bold text-purple-600 transition-all cursor-pointer relative z-10"
            >
              Ask AI Summary
            </button>
          </div>

          {/* Live Activity Telemetry Logs */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Live Activity Feed</h4>
              <span className="flex h-1.5 w-1.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-3 font-mono">
              {activeEvents.map((evt) => (
                <div key={evt.id} className="text-[10px] flex justify-between gap-3 items-start leading-relaxed p-2.5 rounded-lg border border-border bg-background select-none animate-in fade-in duration-200">
                  <span className={`font-semibold ${
                    evt.type === "ai" ? "text-purple-600" : "text-zinc-650"
                  }`}>
                    &gt; {evt.text}
                  </span>
                  <span className="text-zinc-400 shrink-0 text-[9px]">{evt.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TASK MODAL OVERLAY */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-4 shadow-lg animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Create Task</h4>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-zinc-400 hover:text-zinc-800 text-xs font-black cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Task Title</label>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Description</label>
                <textarea
                  placeholder="Task details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full min-h-[60px] rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="w-full h-9 rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DOCUMENT MODAL OVERLAY */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-4 shadow-lg animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Create Wiki Document</h4>
              <button onClick={() => setIsDocModalOpen(false)} className="text-zinc-400 hover:text-zinc-800 text-xs font-black cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateDoc} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Document Title</label>
                <input
                  type="text"
                  placeholder="Document title..."
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={createDocMutation.isPending}
                className="w-full h-9 rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {createDocMutation.isPending ? "Creating..." : "Create Document"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
