import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import { getSocket } from "../../services/socket/connection";

import MeetingToWorkflowModal from "../../components/workspace/MeetingToWorkflowModal";
import WorkspaceHealthCard from "../../components/workspace/WorkspaceHealthCard";
import SprintPlannerModal from "../../components/workspace/SprintPlannerModal";
import GitHubIntegrationModal from "../../components/workspace/GitHubIntegrationModal";
import WorkspaceMemoryModal from "../../components/workspace/WorkspaceMemoryModal";
import { 
  ClipboardList, 
  Zap, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  Layers, 
  GitPullRequest, 
  Brain, 
  Plus, 
  Bot,
  BarChart2,
  BookOpen,
  CalendarDays,
  FileText
} from "lucide-react";

export default function WorkspaceHome() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { activeRightPanel, setRightPanel, openCopilot } = useUIStore();

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
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

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

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ["workspaceSprints", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/sprints`).then((r) => r.data.sprints),
    enabled: !!workspaceId,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["workspaceDashboard", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/dashboard`).then((r) => r.data.dashboard),
    enabled: !!workspaceId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data.notifications || []),
  });

  // Real-time Socket.io invalidators
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskChange = () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
    };
    const handleSprintChange = () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceSprints", workspaceId] });
    };
    const handleDocChange = () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceDocsList", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
    };
    const handleNotificationChange = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const handleMemberChange = () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", workspaceId] });
    };

    socket.on("taskCreated", handleTaskChange);
    socket.on("taskUpdated", handleTaskChange);
    socket.on("taskDeleted", handleTaskChange);
    socket.on("sprintCreated", handleSprintChange);
    socket.on("sprintUpdated", handleSprintChange);
    socket.on("documentCreated", handleDocChange);
    socket.on("documentUpdated", handleDocChange);
    socket.on("documentDeleted", handleDocChange);
    socket.on("notification:new", handleNotificationChange);
    socket.on("memberAdded", handleMemberChange);
    socket.on("memberRemoved", handleMemberChange);

    return () => {
      socket.off("taskCreated", handleTaskChange);
      socket.off("taskUpdated", handleTaskChange);
      socket.off("taskDeleted", handleTaskChange);
      socket.off("sprintCreated", handleSprintChange);
      socket.off("sprintUpdated", handleSprintChange);
      socket.off("documentCreated", handleDocChange);
      socket.off("documentUpdated", handleDocChange);
      socket.off("documentDeleted", handleDocChange);
      socket.off("notification:new", handleNotificationChange);
      socket.off("memberAdded", handleMemberChange);
      socket.off("memberRemoved", handleMemberChange);
    };
  }, [workspaceId, queryClient]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => {
      setIsTaskModalOpen(false); setTaskTitle(""); setTaskDesc(""); setTaskPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/documents`, data),
    onSuccess: () => {
      setIsDocModalOpen(false); setDocTitle("");
      queryClient.invalidateQueries({ queryKey: ["workspaceDocsList", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
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

  const stats = [
    { label: "Open Tasks", value: tasks.filter((t) => t.status !== "DONE").length, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200/60", icon: <ClipboardList className="h-5 w-5 text-amber-650" /> },
    { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200/60", icon: <Zap className="h-5 w-5 text-blue-600" /> },
    { label: "Completed", value: tasks.filter((t) => t.status === "DONE").length, color: "text-green-600", bg: "bg-green-50", border: "border-green-200/60", icon: <CheckCircle2 className="h-5 w-5 text-green-650" /> },
    { label: "Team Size", value: members.length, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", icon: <Users className="h-5 w-5 text-primary" /> },
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

  // Calculations
  const priorityMap = {
    URGENT: { label: "Urgent", className: "ac-badge-red" },
    HIGH: { label: "High", className: "ac-badge-amber" },
    MEDIUM: { label: "Medium", className: "ac-badge-teal" },
    LOW: { label: "Low", className: "ac-badge-gray" },
  };

  // 1. My Work
  const myTasks = tasks.filter(t => t.assignedTo === user?.id && t.status !== "DONE");
  const sortedMyTasks = [...myTasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });

  const tasksDueToday = myTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);

  // 2. Sprints
  const activeSprint = sprints.find(s => s.status === "ACTIVE");
  let sprintProgress = 0;
  let completedSprintTasksCount = 0;
  let totalSprintTasksCount = 0;
  let sprintTasksList = [];
  if (activeSprint) {
    sprintTasksList = activeSprint.tasks?.map(st => st.task).filter(Boolean) || [];
    totalSprintTasksCount = sprintTasksList.length;
    completedSprintTasksCount = sprintTasksList.filter(t => t.status === "DONE").length;
    sprintProgress = totalSprintTasksCount > 0 ? Math.round((completedSprintTasksCount / totalSprintTasksCount) * 100) : 0;
  }

  // 3. Team Activity (Recent Work)
  const recentActivityItems = [];
  tasks.forEach(t => {
    recentActivityItems.push({
      id: `task-${t.id}`,
      title: t.title,
      type: "Task",
      updatedAt: new Date(t.updatedAt),
      link: `/workspaces/${workspaceId}/tasks`
    });
  });
  docs.forEach(d => {
    recentActivityItems.push({
      id: `doc-${d.id}`,
      title: d.title,
      type: "Document",
      updatedAt: new Date(d.updatedAt),
      link: `/workspaces/${workspaceId}/docs`
    });
  });
  const sortedActivity = recentActivityItems.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // 4. CollabAI Context
  const tasksDueThisWeek = tasks.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false;
    const d = new Date(t.dueDate);
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  if (tasksLoading || sprintsLoading) {
    return (
      <div className="h-full overflow-y-auto bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-pulse">
          <div className="space-y-2 border-b border-zinc-200/60 pb-6">
            <div className="h-8 w-48 bg-zinc-200 rounded" />
            <div className="h-4 w-72 bg-zinc-150 rounded mt-1.5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-64 bg-white border border-zinc-200/80 rounded-2xl p-6" />
            <div className="h-64 bg-white border border-zinc-200/80 rounded-2xl p-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50/50 select-none">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header greeting */}
        <div className="border-b border-zinc-200/60 pb-6">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">
            {greeting}, <span className="text-primary">{user?.firstName || user?.username || "there"}</span> 👋
          </h1>
          <p className="text-sm text-zinc-550 mt-1.5 font-medium">
            Here's what's happening in your workspace today.
          </p>
        </div>

        {/* Proactive AI Insights (Only if returned from real backend endpoint) */}
        <WorkspaceHealthCard onOpenMeetingModal={() => setIsMeetingModalOpen(true)} />

        {/* Two-Column Grid: My Work & Current Sprint */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* My Work Section */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-800 tracking-tight uppercase">My Work</h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                  {tasksDueToday.length > 0 && (
                    <span className="bg-red-50 text-red-650 px-2 py-0.5 rounded-full border border-red-200/60">
                      {tasksDueToday.length} due today
                    </span>
                  )}
                  {dashboardData?.cards?.unreadMessages > 0 && (
                    <span className="bg-blue-50 text-blue-650 px-2 py-0.5 rounded-full border border-blue-200/60">
                      {dashboardData.cards.unreadMessages} messages
                    </span>
                  )}
                </div>
              </div>

              {sortedMyTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400 font-medium">
                  No tasks assigned to you right now. Nice work!
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto no-scrollbar">
                  {sortedMyTasks.slice(0, 5).map((task) => {
                    const p = priorityMap[task.priority] || priorityMap.MEDIUM;
                    return (
                      <Link
                        key={task.id}
                        to={`/workspaces/${workspaceId}/tasks`}
                        className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200/80 hover:bg-zinc-50/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            task.status === "DONE" ? "bg-green-500" : task.status === "IN_PROGRESS" ? "bg-blue-500" : task.status === "IN_REVIEW" ? "bg-amber-500" : "bg-zinc-300"
                          }`} />
                          <p className="text-sm font-semibold text-zinc-700 truncate">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.dueDate && (
                            <span className="text-xs text-zinc-450 font-medium">
                              {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          )}
                          <span className={`ac-badge ${p.className}`}>{p.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 mt-4 flex justify-end">
              <Link
                to={`/workspaces/${workspaceId}/tasks`}
                className="text-xs font-bold text-primary hover:text-[#087F66] transition-colors"
              >
                View my work →
              </Link>
            </div>
          </div>

          {/* Current Sprint Section */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-800 tracking-tight uppercase">Current Sprint</h2>
                {activeSprint && (
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              {!activeSprint ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-zinc-400 font-medium">No active sprint cycle currently running.</p>
                  <button
                    onClick={() => setIsSprintModalOpen(true)}
                    className="h-8.5 px-4 rounded-lg bg-primary hover:bg-[#087F66] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Open Sprint Planner</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">{activeSprint.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                      Ends {new Date(activeSprint.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-550">
                      <span>Progress</span>
                      <span>{sprintProgress}% ({completedSprintTasksCount} / {totalSprintTasksCount} tasks)</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/40">
                      <div
                        className="h-full bg-primary transition-all duration-700"
                        style={{ width: `${sprintProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-zinc-550 font-medium">To Do</p>
                      <p className="text-base font-bold text-zinc-800 mt-0.5">
                        {sprintTasksList.filter(t => t.status === "TODO").length}
                      </p>
                    </div>
                    <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-zinc-550 font-medium">In Progress</p>
                      <p className="text-base font-bold text-blue-650 mt-0.5">
                        {sprintTasksList.filter(t => t.status === "IN_PROGRESS").length}
                      </p>
                    </div>
                    <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-zinc-550 font-medium">Done</p>
                      <p className="text-base font-bold text-emerald-650 mt-0.5">
                        {completedSprintTasksCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeSprint && (
              <div className="pt-4 border-t border-zinc-100 mt-4 flex justify-end">
                <Link
                  to={`/workspaces/${workspaceId}/tasks`}
                  className="text-xs font-bold text-primary hover:text-[#087F66] transition-colors"
                >
                  Open Board →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Two-Column Grid: Recent Activity & CollabAI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          
          {/* Recent Workspace Activity */}
          <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-800 tracking-tight uppercase border-b border-zinc-100 pb-3">
              Recent Workspace Activity
            </h2>

            {sortedActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400 font-medium">
                No recent activity in this workspace yet. Create tasks or documents to see updates!
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[260px] overflow-y-auto no-scrollbar">
                {sortedActivity.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-zinc-50/50 rounded-lg px-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-center text-xs font-semibold text-zinc-500 shrink-0">
                        {item.type === "Task" ? <ClipboardList className="h-4 w-4 text-zinc-450" /> : <BookOpen className="h-4 w-4 text-zinc-450" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{item.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 font-medium">{item.type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-450 font-medium shrink-0">
                      Updated {getRelativeTime(item.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* CollabAI Assistant Context Widget */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <div className="h-6 w-6 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <h2 className="text-sm font-bold text-zinc-800 tracking-tight uppercase">CollabAI</h2>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                I can help you analyze, search, and automate workflows in this workspace.
              </p>

              {/* Workspace Context Data */}
              <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Workspace Context</p>
                <div className="space-y-1.5 text-xs text-zinc-650 font-medium">
                  <p className="flex items-center justify-between">
                    <span>Blocked tasks:</span>
                    <span className="font-bold text-zinc-850">{tasks.filter(t => t.status === "BLOCKED").length}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Tasks due this week:</span>
                    <span className="font-bold text-zinc-850">{tasksDueThisWeek}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Unread notifications:</span>
                    <span className="font-bold text-zinc-850">{unreadNotifications.length}</span>
                  </p>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Suggested prompts</p>
                <div className="space-y-1.5">
                  {[
                    { label: "What's blocking the sprint?", prompt: "What is blocking sprint?" },
                    { label: "What do I need to finish today?", prompt: "What do I need to finish today?" },
                    { label: "Summarize recent activity", prompt: "Summarize recent activity in this workspace." }
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => openCopilot(s.prompt)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-violet-50/50 border border-violet-100 hover:bg-violet-100/60 hover:border-violet-200 text-xs font-semibold text-violet-750 transition-all cursor-pointer"
                    >
                      {s.label} →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-3.5">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quick Actions</p>
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="h-9 px-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-zinc-450" />
              <span>New Task</span>
            </button>

            <button
              onClick={() => setIsDocModalOpen(true)}
              className="h-9 px-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-zinc-455" />
              <span>New Document</span>
            </button>

            <Link
              to={`/workspaces/${workspaceId}/settings`}
              className="h-9 px-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5 text-zinc-450" />
              <span>Invite Teammate</span>
            </Link>

            <button
              onClick={() => setRightPanel(activeRightPanel === "AI_COPILOT" ? null : "AI_COPILOT")}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-[#087F66] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Bot className="h-3.5 w-3.5 text-white/90 shrink-0" />
              <span>Ask CollabAI</span>
            </button>
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

      {/* ── Flagship Modals ── */}
      <MeetingToWorkflowModal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} />
      <SprintPlannerModal isOpen={isSprintModalOpen} onClose={() => setIsSprintModalOpen(false)} />
      <GitHubIntegrationModal isOpen={isGitHubModalOpen} onClose={() => setIsGitHubModalOpen(false)} />
      <WorkspaceMemoryModal isOpen={isMemoryModalOpen} onClose={() => setIsMemoryModalOpen(false)} />
    </div>
  );
}
