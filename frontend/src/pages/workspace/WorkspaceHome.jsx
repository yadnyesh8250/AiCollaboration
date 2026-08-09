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

  // Greeting
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [docTitle, setDocTitle] = useState("");

  // Queries
  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data.members),
    enabled: !!workspaceId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["workspaceTasks", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((r) => r.data.tasks),
    enabled: !!workspaceId,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["workspaceDocsList", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/documents`).then((r) => r.data.documents),
    enabled: !!workspaceId,
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => {
      setIsTaskModalOpen(false); setTaskTitle(""); setTaskDesc(""); setTaskPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/documents`, data),
    onSuccess: () => {
      setIsDocModalOpen(false); setDocTitle("");
      queryClient.invalidateQueries({ queryKey: ["workspaceDocsList", workspaceId] });
    },
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    createTaskMutation.mutate({ title: taskTitle.trim(), description: taskDesc.trim(), priority: taskPriority, status: "TODO" });
  };

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    createDocMutation.mutate({ title: docTitle.trim(), visibility: "WORKSPACE" });
  };

  // Onboarding milestones
  const milestones = [
    { label: "Invite teammates", desc: "Add collaborators to your workspace", done: members.length > 1 },
    { label: "Create first task", desc: "Populate the project board", done: tasks.length > 0 },
    { label: "Write a document", desc: "Start your team knowledge base", done: docs.length > 0 },
    { label: "Open AI Copilot", desc: "Let CollabAI help your team work", done: activeRightPanel === "AI_COPILOT" },
  ];
  const completed = milestones.filter((m) => m.done).length;
  const progress = Math.round((completed / milestones.length) * 100);

  // Stat cards
  const stats = [
    { label: "Open Tasks", value: tasks.filter((t) => t.status !== "DONE").length, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: "📋" },
    { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: "⚡" },
    { label: "Completed", value: tasks.filter((t) => t.status === "DONE").length, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: "✅" },
    { label: "Team Size", value: members.length, color: "text-primary", bg: "bg-accent", border: "border-[#0F9F78]/20", icon: "👥" },
  ];

  // Calendar
  const getCalendarDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  };
  const calendarDays = getCalendarDays();
  const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const today = new Date().getDate();

  // Recent tasks (last 5)
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const priorityMap = {
    URGENT: { label: "Urgent", className: "ac-badge-red" },
    HIGH: { label: "High", className: "ac-badge-amber" },
    MEDIUM: { label: "Medium", className: "ac-badge-teal" },
    LOW: { label: "Low", className: "ac-badge-gray" },
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {greeting},{" "}
              <span className="text-primary">{user?.firstName || user?.username || "there"}</span> 👋
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Here's what's happening in your workspace today.
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-zinc-50 hover:border-zinc-300 text-sm font-medium text-zinc-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-zinc-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Task
            </button>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-zinc-50 hover:border-zinc-300 text-sm font-medium text-zinc-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-zinc-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Doc
            </button>
            <button
              onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-[#087F66] text-white text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
              </svg>
              Ask CollabAI
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`bg-white border ${stat.border} rounded-xl p-5 flex items-center gap-4`}>
              <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center text-xl shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{tasksLoading ? "—" : stat.value}</p>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Setup checklist + Recent tasks */}
          <div className="lg:col-span-2 space-y-6">

            {/* Onboarding Checklist */}
            {progress < 100 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Get started with A-Collab</h3>
                    <p className="text-sm text-zinc-400 mt-0.5">Complete setup to unlock your full workspace potential</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                    <p className="text-xs text-zinc-400 font-medium">{completed}/{milestones.length} done</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-zinc-100">
                  <div
                    className="h-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        m.done ? "bg-accent/50 border-[#0F9F78]/20" : "bg-white border-border hover:border-zinc-300"
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        m.done ? "bg-primary text-white" : "border-2 border-zinc-200 text-zinc-400"
                      }`}>
                        {m.done ? "✓" : i + 1}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${m.done ? "text-primary line-through" : "text-zinc-800"}`}>{m.label}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tasks */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900">Recent Tasks</h3>
                <Link
                  to={`/workspaces/${workspaceId}/tasks`}
                  className="text-sm font-medium text-primary hover:text-[#087F66] transition-colors"
                >
                  View all →
                </Link>
              </div>

              {tasksLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-100 rounded-lg" />)}
                  </div>
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="empty-state px-6">
                  <div className="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5 3 12l3.75 4.5m6.75-9L17.25 12l-3.75 4.5m-3.375.75 1.875-9" />
                    </svg>
                  </div>
                  <p className="empty-state-title">No tasks yet</p>
                  <p className="empty-state-desc">Create your first task to start tracking work</p>
                  <button onClick={() => setIsTaskModalOpen(true)} className="btn-primary mt-4 h-9 px-4 text-sm">
                    Create Task
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentTasks.map((task) => {
                    const p = priorityMap[task.priority] || priorityMap.MEDIUM;
                    const statusColor = {
                      TODO: "text-zinc-500", IN_PROGRESS: "text-blue-600", IN_REVIEW: "text-amber-600", DONE: "text-green-600"
                    }[task.status] || "text-zinc-500";
                    return (
                      <div key={task.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors cursor-pointer">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${
                          task.status === "DONE" ? "bg-green-500" : task.status === "IN_PROGRESS" ? "bg-blue-500" : task.status === "IN_REVIEW" ? "bg-amber-500" : "bg-zinc-300"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.status === "DONE" ? "line-through text-zinc-400" : "text-zinc-800"}`}>
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Due {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                        <span className={`ac-badge ${p.className} shrink-0`}>{p.label}</span>
                        <span className={`text-xs font-medium ${statusColor} shrink-0 hidden sm:block`}>
                          {task.status?.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calendar + AI card */}
          <div className="space-y-6">

            {/* Mini Calendar */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-zinc-900">{monthName}</h3>
              </div>
              <div className="p-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Days */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={i} className="aspect-square" />;
                    const isToday = day.getDate() === today;
                    const hasTasks = tasks.some((t) => {
                      if (!t.dueDate) return false;
                      const d = new Date(t.dueDate);
                      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth();
                    });
                    return (
                      <div
                        key={i}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg relative transition-colors cursor-default text-sm ${
                          isToday
                            ? "bg-primary text-white font-semibold"
                            : "hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        <span>{day.getDate()}</span>
                        {hasTasks && !isToday && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500" />
                        )}
                        {hasTasks && isToday && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/70" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Insight Card */}
            <div className="bg-white border border-violet-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-violet-100 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-violet-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">CollabAI</p>
                  <p className="text-xs text-zinc-400">Workspace intelligence</p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="space-y-2">
                  {[
                    { icon: "📊", text: `${tasks.filter((t) => t.status === "IN_PROGRESS").length} tasks in progress right now` },
                    { icon: "📚", text: `${docs.length} knowledge documents created` },
                    { icon: "👥", text: `${members.length} team member${members.length !== 1 ? "s" : ""} in this workspace` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-600">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
                  className="w-full h-9 rounded-lg bg-violet-50 border border-violet-200 hover:bg-violet-100 text-sm font-medium text-violet-600 transition-all cursor-pointer"
                >
                  Open CollabAI →
                </button>
              </div>
            </div>

            {/* Recent Docs */}
            {docs.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">Recent Documents</h3>
                  <Link to={`/workspaces/${workspaceId}/docs`} className="text-xs text-primary hover:text-[#087F66]">All docs →</Link>
                </div>
                <div className="divide-y divide-border">
                  {docs.slice(0, 4).map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/workspaces/${workspaceId}/docs`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-zinc-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <p className="text-sm text-zinc-700 truncate">{doc.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Task Modal ── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-zinc-900">Create Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Title</label>
                <input className="ac-input" placeholder="Task title..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                <textarea className="ac-textarea min-h-[80px]" placeholder="Describe the task..." value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Priority</label>
                <select className="ac-select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createTaskMutation.isPending} className="btn-primary flex-1">
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Doc Modal ── */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-zinc-900">Create Document</h3>
              <button onClick={() => setIsDocModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateDoc} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Document Title</label>
                <input className="ac-input" placeholder="Untitled document..." value={docTitle} onChange={(e) => setDocTitle(e.target.value)} autoFocus required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createDocMutation.isPending} className="btn-primary flex-1">
                  {createDocMutation.isPending ? "Creating..." : "Create Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
