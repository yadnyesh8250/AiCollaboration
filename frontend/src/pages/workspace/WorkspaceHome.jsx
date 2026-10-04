import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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

/* ══════════════════════════════════════════════════════
   A-Collab Workspace Home — Stitch Workspace OS Design
   ══════════════════════════════════════════════════════ */
export default function WorkspaceHome() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeRightPanel, setRightPanel, openCopilot, setCommandPalette } = useUIStore();

  // Greeting
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Filter tab for "My Work"
  const [workFilterTab, setWorkFilterTab] = useState("all");
  const [quickAiPrompt, setQuickAiPrompt] = useState("");

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Form states
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

  // Global keyboard shortcuts (C for new task, Cmd+J for AI)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsTaskModalOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        openCopilot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCopilot]);

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
      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("MEDIUM");
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/documents`, data),
    onSuccess: (res) => {
      setIsDocModalOpen(false);
      setDocTitle("");
      queryClient.invalidateQueries({ queryKey: ["workspaceDocsList", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
      const newDocId = res.data?.document?.id;
      if (newDocId) {
        navigate(`/workspaces/${workspaceId}/docs`);
      }
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.patch(`/workspaces/${workspaceId}/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceDashboard", workspaceId] });
    },
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      status: "TODO"
    });
  };

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    createDocMutation.mutate({ title: docTitle.trim(), visibility: "WORKSPACE" });
  };

  // Calculations for My Tasks
  const myTasks = tasks.filter(t => t.assignedTo === user?.id || !t.assignedTo);
  const overdueTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false;
    return new Date(t.dueDate) < new Date();
  });
  const dueTodayTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false;
    const d = new Date(t.dueDate);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const inProgressTasks = myTasks.filter(t => t.status === "IN_PROGRESS");
  const upcomingTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false;
    return new Date(t.dueDate) > new Date();
  });

  // Filtered list based on active tab
  let displayedTasks = myTasks;
  if (workFilterTab === "today") displayedTasks = dueTodayTasks;
  else if (workFilterTab === "overdue") displayedTasks = overdueTasks;
  else if (workFilterTab === "progress") displayedTasks = inProgressTasks;
  else if (workFilterTab === "upcoming") displayedTasks = upcomingTasks;

  // Active Sprint
  const activeSprint = sprints.find(s => s.status === "ACTIVE") || sprints[0];
  let sprintProgress = 0;
  let completedSprintTasksCount = 0;
  let totalSprintTasksCount = 0;
  let sprintTasksList = [];
  let inProgressCount = 0;
  let blockedCount = 0;
  let todoCount = 0;

  if (activeSprint) {
    sprintTasksList = activeSprint.tasks?.map(st => st.task).filter(Boolean) || [];
    totalSprintTasksCount = sprintTasksList.length;
    completedSprintTasksCount = sprintTasksList.filter(t => t.status === "DONE").length;
    inProgressCount = sprintTasksList.filter(t => t.status === "IN_PROGRESS").length;
    blockedCount = sprintTasksList.filter(t => t.status === "BLOCKED").length;
    todoCount = sprintTasksList.filter(t => t.status === "TODO").length;
    sprintProgress = totalSprintTasksCount > 0 ? Math.round((completedSprintTasksCount / totalSprintTasksCount) * 100) : 0;
  }

  // Activity stream
  const recentActivityItems = [];
  tasks.forEach(t => {
    recentActivityItems.push({
      id: `task-${t.id}`,
      title: t.title,
      type: "task",
      updatedAt: new Date(t.updatedAt),
      creator: t.assignee?.firstName || t.assignee?.username || "Teammate",
      link: `/workspaces/${workspaceId}/tasks`
    });
  });
  docs.forEach(d => {
    recentActivityItems.push({
      id: `doc-${d.id}`,
      title: d.title,
      type: "doc",
      updatedAt: new Date(d.updatedAt),
      creator: d.author?.firstName || d.author?.username || "Teammate",
      link: `/workspaces/${workspaceId}/docs`
    });
  });
  const sortedActivity = recentActivityItems.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

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

  const displayName = user?.firstName || user?.username || "Yadnyesh";

  return (
    <div className="h-full overflow-y-auto bg-surface-ws select-none">
      <div className="p-space-lg max-w-7xl mx-auto w-full space-y-space-lg">
        
        {/* ══ Top Greeting & Dispatch Actions ══ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {greeting}, {displayName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                All systems normal
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Here's what needs your attention today across A-Collab Development.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            <Link
              to={`/workspaces/${workspaceId}/settings`}
              className="h-8 px-space-sm bg-surface-container-lowest hover:bg-surface-container-low text-on-surface rounded-lg shadow-sm font-body-sm text-body-sm flex items-center gap-1.5 transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
              <span>Invite Member</span>
            </Link>

            <button
              onClick={() => setIsDocModalOpen(true)}
              className="h-8 px-space-sm bg-surface-container-lowest hover:bg-surface-container-low text-on-surface rounded-lg shadow-sm font-body-sm text-body-sm flex items-center gap-1.5 transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>note_add</span>
              <span>New Document</span>
            </button>

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="h-8 px-space-sm bg-primary text-on-primary hover:bg-primary-container transition-colors rounded-lg shadow-sm font-body-sm text-body-sm font-medium flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_task</span>
              <span>New Task</span>
              <span className="font-label-sm text-label-sm opacity-70 ml-0.5 font-mono px-1 py-0.2 rounded bg-black/20">C</span>
            </button>

            <button
              onClick={() => openCopilot()}
              className="h-8 px-space-sm bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim transition-colors rounded-lg font-body-sm text-body-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>auto_awesome</span>
              <span>Ask CollabAI</span>
              <kbd className="font-label-sm text-label-sm px-1 py-0.2 rounded bg-on-secondary-fixed/10 text-on-secondary-fixed font-mono">⌘J</kbd>
            </button>
          </div>
        </div>

        {/* ══ Proactive Health Card (if triggered) ══ */}
        <WorkspaceHealthCard onOpenMeetingModal={() => setIsMeetingModalOpen(true)} />

        {/* ══ Core Grid: 8 Cols Primary Work Area + 4 Cols Intelligence Rail ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          
          {/* ── Left 8 Columns ── */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            
            {/* 1. MY WORK SECTION */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 overflow-hidden">
              <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest border-b border-surface-container">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-xl">checklist</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">My Work</h2>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                    {displayedTasks.length} active
                  </span>
                </div>

                {/* Segmented Filter Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-surface-container-low rounded-lg">
                  <button
                    onClick={() => setWorkFilterTab("all")}
                    className={`px-2.5 py-1 rounded-md font-label-md text-label-md font-medium transition-all ${
                      workFilterTab === "all" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    All Tasks <span className="ml-1 opacity-70 font-semibold">{myTasks.length}</span>
                  </button>
                  <button
                    onClick={() => setWorkFilterTab("today")}
                    className={`px-2.5 py-1 rounded-md font-label-md text-label-md font-medium transition-all ${
                      workFilterTab === "today" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Due Today <span className="text-secondary font-semibold ml-1">{dueTodayTasks.length}</span>
                  </button>
                  <button
                    onClick={() => setWorkFilterTab("overdue")}
                    className={`px-2.5 py-1 rounded-md font-label-md text-label-md font-medium transition-all ${
                      workFilterTab === "overdue" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Overdue <span className="text-error-stitch font-semibold ml-1">{overdueTasks.length}</span>
                  </button>
                  <button
                    onClick={() => setWorkFilterTab("progress")}
                    className={`px-2.5 py-1 rounded-md font-label-md text-label-md font-medium transition-all ${
                      workFilterTab === "progress" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    In Progress <span className="ml-1 opacity-70">{inProgressTasks.length}</span>
                  </button>
                </div>
              </div>

              {/* Task List Rows */}
              <div className="divide-y divide-surface-container">
                {displayedTasks.length === 0 ? (
                  <div className="p-space-xl text-center">
                    <span className="material-symbols-outlined text-outline text-3xl mb-1">task_alt</span>
                    <p className="font-body-md text-body-md text-on-surface-variant">No tasks match this filter. Everything is up to date!</p>
                  </div>
                ) : (
                  displayedTasks.slice(0, 5).map((task) => {
                    const isDone = task.status === "DONE";
                    const isUrgent = task.priority === "URGENT";
                    const isHigh = task.priority === "HIGH";
                    const isMed = task.priority === "MEDIUM";

                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors cursor-pointer bg-surface-container-lowest"
                        onClick={() => navigate(`/workspaces/${workspaceId}/tasks`)}
                      >
                        <div className="flex items-start gap-space-sm min-w-0 pr-space-md">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatusMutation.mutate({
                                taskId: task.id,
                                status: isDone ? "TODO" : "DONE"
                              });
                            }}
                            className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0 ${
                              isDone ? "bg-secondary text-white border-secondary" : "border-outline-variant hover:border-primary hover:text-primary text-transparent"
                            }`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                          </button>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-label-sm text-label-sm text-outline font-mono">
                                TSK-{task.id?.slice(0, 4) || "101"}
                              </span>
                              <span className={`font-body-md text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors ${isDone ? "line-through text-outline" : ""}`}>
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-space-sm mt-1 text-on-surface-variant font-label-sm text-label-sm">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>folder_open</span>
                                {task.status || "Core"}
                              </span>
                              <span className="text-outline-variant">•</span>
                              <span>
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "No due date"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-space-md flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-medium ${
                            isUrgent ? "bg-error-container/40 text-error-stitch" :
                            isHigh ? "bg-error-container/20 text-error-stitch" :
                            isMed ? "bg-surface-container-high text-on-surface-variant" :
                            "bg-surface-container text-outline"
                          }`}>
                            {task.priority || "Medium"}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm ${
                            isDone ? "bg-secondary-container/40 text-on-secondary-container" :
                            task.status === "IN_PROGRESS" ? "bg-primary-container/20 text-primary" :
                            "bg-surface-container text-on-surface"
                          }`}>
                            {task.status || "Todo"}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. CURRENT SPRINT PROGRESS */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div>
                  <div className="flex items-center gap-space-xs text-on-surface">
                    <span className="material-symbols-outlined text-secondary text-lg">surfing</span>
                    <h3 className="font-headline-sm text-headline-sm font-semibold tracking-tight">
                      {activeSprint ? activeSprint.name : "Sprint Cycle: Core Engine"}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-medium">
                      Active
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {activeSprint?.goal || "Goal: High performance task orchestration, documents, and real-time collaboration"}
                  </p>
                </div>

                <div className="flex items-center gap-space-md self-end sm:self-auto">
                  <span className="font-label-sm text-label-sm font-mono text-outline">
                    {activeSprint?.endDate ? `Deadline: ${new Date(activeSprint.endDate).toLocaleDateString([], { month: "short", day: "numeric" })}` : "Ongoing"}
                  </span>
                  <button
                    onClick={() => setIsSprintModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium transition-colors border border-outline-variant/30"
                  >
                    Sprint Planner
                  </button>
                </div>
              </div>

              {/* Segmented Linear Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-caption text-caption text-on-surface-variant">
                  <span>
                    <strong className="text-on-surface font-semibold">
                      {completedSprintTasksCount} of {totalSprintTasksCount || tasks.length} tasks
                    </strong> completed
                  </span>
                  <span className="font-mono font-semibold text-secondary">
                    {sprintProgress}% Velocity
                  </span>
                </div>

                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  <div
                    className="h-full bg-secondary rounded-l-full transition-all duration-500"
                    style={{ width: `${Math.max(sprintProgress, 5)}%` }}
                    title={`Completed: ${completedSprintTasksCount}`}
                  />
                  <div
                    className="h-full bg-tertiary-fixed-dim transition-all duration-500"
                    style={{ width: `${Math.min(inProgressCount * 10, 30)}%` }}
                    title={`In Progress: ${inProgressCount}`}
                  />
                  <div
                    className="h-full bg-error-stitch transition-all duration-500"
                    style={{ width: `${Math.min(blockedCount * 10, 20)}%` }}
                    title={`Blocked: ${blockedCount}`}
                  />
                  <div
                    className="h-full bg-surface-container-high rounded-r-full flex-1"
                    title={`Remaining: ${todoCount}`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between pt-1 font-label-sm text-label-sm text-on-surface-variant">
                  <div className="flex items-center gap-space-md">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary" /> {completedSprintTasksCount} Done
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" /> {inProgressCount} In Progress
                    </span>
                    {blockedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-error-stitch font-medium">
                        <span className="w-2 h-2 rounded-full bg-error-stitch" /> {blockedCount} Blocked
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-surface-container-highest" /> {todoCount || tasks.length} Backlog
                    </span>
                  </div>
                  <Link
                    to={`/workspaces/${workspaceId}/tasks`}
                    className="inline-flex items-center gap-1 text-primary hover:text-secondary font-medium transition-colors"
                  >
                    <span>Open Sprint Board</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 3. RECENT ACTIVITY TIMELINE */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">history</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Workspace Timeline</h3>
                </div>
                <button
                  onClick={() => setIsMemoryModalOpen(true)}
                  className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>neurology</span>
                  <span>AI Memory Context</span>
                </button>
              </div>

              <div className="relative pl-6 space-y-space-md before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                {sortedActivity.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant py-4">No recent events logged yet.</p>
                ) : (
                  sortedActivity.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-space-sm group">
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xs">
                        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                          {act.type === "task" ? "add_task" : "description"}
                        </span>
                      </span>
                      <div className="flex-1 bg-surface-container-low p-space-sm rounded-lg hover:bg-surface-container transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-body-sm text-body-sm font-semibold text-on-surface">{act.creator}</span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              updated {act.type}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-outline">{getRelativeTime(act.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="material-symbols-outlined text-sm text-primary">
                            {act.type === "task" ? "checklist" : "description"}
                          </span>
                          <Link to={act.link} className="font-body-sm text-body-sm font-medium text-on-surface hover:text-primary transition-colors">
                            {act.title}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* ── Right 4 Columns: Intelligence & Presence ── */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg" id="collab-ai-rail">
            
            {/* CollabAI Workspace Intelligence Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 p-space-lg relative overflow-hidden">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Workspace Intel</h3>
                    <span className="font-label-sm text-label-sm text-secondary font-medium">A-Collab Context Engine</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary/20" />
              </div>

              <div className="p-space-sm bg-surface-container-low rounded-lg my-space-sm flex items-start gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-base mt-0.5">info</span>
                <p className="font-body-sm text-body-sm text-on-surface">
                  CollabAI synthesized <strong>{tasks.length} tasks</strong> &amp; <strong>{docs.length} docs</strong> into real-time workflow recommendations.
                </p>
              </div>

              {/* Actionable Prompt Cards */}
              <div className="flex flex-col gap-space-sm mt-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-error-container/40 text-error-stitch font-label-sm text-label-sm font-medium">
                      Sprint Analysis
                    </span>
                    <span className="font-label-sm text-label-sm text-outline font-mono">Active</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium mt-1">
                    Detect blockers and review task assignments for the current sprint
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => openCopilot("What is blocking sprint?")}
                      className="h-7 px-space-sm bg-primary text-on-primary text-label-md font-label-md rounded-md font-medium hover:bg-primary-container transition-colors"
                    >
                      Resolve Blockers
                    </button>
                    <span
                      onClick={() => openCopilot("What is blocking sprint?")}
                      className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      Analyze →
                    </span>
                  </div>
                </div>

                <div className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-medium">
                      Daily Focus
                    </span>
                    <span className="font-label-sm text-label-sm text-outline font-mono">Today</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium mt-1">
                    Review tasks due today and priority items requiring sign-off
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => openCopilot("What do I need to finish today?")}
                      className="h-7 px-space-sm bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim text-label-md font-label-md rounded-md font-medium transition-colors"
                    >
                      View Priorities
                    </button>
                    <span
                      onClick={() => openCopilot("What do I need to finish today?")}
                      className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      Review →
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Command Input */}
              <div className="mt-space-lg pt-space-sm border-t border-surface-container">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!quickAiPrompt.trim()) return;
                    openCopilot(quickAiPrompt.trim());
                    setQuickAiPrompt("");
                  }}
                  className="relative flex items-center"
                >
                  <input
                    value={quickAiPrompt}
                    onChange={(e) => setQuickAiPrompt(e.target.value)}
                    className="w-full h-9 pl-8 pr-16 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary transition-all border border-outline-variant/20"
                    placeholder="Ask CollabAI about tasks or docs..."
                    type="text"
                  />
                  <span className="material-symbols-outlined text-base absolute left-2 text-primary">auto_awesome</span>
                  <kbd className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant absolute right-2 font-mono">⌘J</kbd>
                </form>
              </div>
            </div>

            {/* Team Focus / Live Presence */}
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Active Teammates</h4>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  {members.length} members
                </span>
              </div>
              <div className="space-y-space-xs pt-1">
                {members.slice(0, 4).map((m, idx) => (
                  <div key={m.id || idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                          {(m.user?.firstName || m.user?.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="w-2 h-2 rounded-full bg-secondary absolute bottom-0 right-0 ring-1 ring-white" />
                      </div>
                      <div className="truncate">
                        <span className="font-body-sm text-body-sm font-medium text-on-surface block truncate">
                          {m.user?.firstName ? `${m.user.firstName} ${m.user.lastName || ""}` : m.user?.username || "Teammate"}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline truncate block">
                          {m.role || "MEMBER"}
                        </span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline-variant">Active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyboard Shortcuts Cheat-Sheet */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/20">
              <span className="font-label-sm text-label-sm uppercase font-semibold text-on-surface-variant tracking-wider">
                Keyboard shortcuts
              </span>
              <div className="grid grid-cols-2 gap-2 text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center justify-between">
                  <span>Create Task</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface shadow-xs font-mono font-bold">C</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Search</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface shadow-xs font-mono font-bold">⌘K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>CollabAI</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface shadow-xs font-mono font-bold">⌘J</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Go to Tasks</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface shadow-xs font-mono font-bold">G T</kbd>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ══ Create Task Modal ══ */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_task</span>
                <h3 className="text-sm font-semibold text-zinc-900">Create Task</h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Title</label>
                <input
                  className="ac-input"
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="ac-textarea min-h-[80px]"
                  placeholder="Describe the task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Priority</label>
                <select
                  className="ac-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Create Document Modal ══ */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">note_add</span>
                <h3 className="text-sm font-semibold text-zinc-900">New Document</h3>
              </div>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleCreateDoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Document Title</label>
                <input
                  className="ac-input"
                  placeholder="e.g. System Architecture RFC..."
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createDocMutation.isPending ? "Creating..." : "Create & Edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Action Modals ══ */}
      {isMeetingModalOpen && (
        <MeetingToWorkflowModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {isSprintModalOpen && (
        <SprintPlannerModal
          isOpen={isSprintModalOpen}
          onClose={() => setIsSprintModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {isGitHubModalOpen && (
        <GitHubIntegrationModal
          isOpen={isGitHubModalOpen}
          onClose={() => setIsGitHubModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {isMemoryModalOpen && (
        <WorkspaceMemoryModal
          isOpen={isMemoryModalOpen}
          onClose={() => setIsMemoryModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
