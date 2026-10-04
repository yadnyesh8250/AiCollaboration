import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";
import { useUIStore } from "../../stores/uiStore";

/* ══════════════════════════════════════════════════════
   A-Collab Task Board & Kanban System
   Stitch Workspace OS Design System
   ══════════════════════════════════════════════════════ */
const COLUMNS = [
  { id: "TODO",        label: "TODO",        dot: "bg-secondary", accent: "bg-surface-container", border: "border-secondary" },
  { id: "IN_PROGRESS", label: "IN PROGRESS", dot: "bg-primary animate-pulse", accent: "bg-primary-container", border: "border-primary" },
  { id: "IN_REVIEW",   label: "IN REVIEW",   dot: "bg-tertiary-fixed-dim", accent: "bg-tertiary-container", border: "border-tertiary" },
  { id: "DONE",        label: "DONE",        dot: "bg-secondary", accent: "bg-secondary-container", border: "border-secondary" },
];

export default function WorkspaceTasks() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const { openCopilot } = useUIStore();

  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState("board"); // 'board' or 'list'
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating / editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusVal, setStatusVal] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["workspaceTasks", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((r) => r.data.tasks),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data.members),
    enabled: !!workspaceId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["taskComments", selectedTask?.id],
    queryFn: () => api.get(`/tasks/${selectedTask?.id}/comments`).then((r) => r.data.comments),
    enabled: !!selectedTask?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: (content) => api.post(`/tasks/${selectedTask?.id}/comments`, { content }),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      setSelectedTask(null);
      setIsModalOpen(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      closeModal();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => api.patch(`/workspaces/${workspaceId}/tasks/${taskId}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      if (selectedTask && res.data?.task) {
        setSelectedTask(res.data.task);
      }
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatusVal("TODO");
    setPriority("MEDIUM");
    setAssignedTo("");
    setDueDate("");
    setEstimatedHours("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = (defaultStatus = "TODO") => {
    resetForm();
    setStatusVal(defaultStatus);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status: statusVal,
      priority,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
    };
    if (selectedTask) {
      updateTaskMutation.mutate({ taskId: selectedTask.id, data: payload });
      closeModal();
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    updateTaskMutation.mutate({ taskId, data: { status } });
  };

  // Filter tasks based on active filter tab
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "mine") return t.assignedTo != null;
    return true;
  });

  const getTasksByStatus = (status) => filteredTasks.filter((t) => t.status === status);

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const velocity = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-surface-ws overflow-hidden select-none">
      
      {/* ══ Top Context & Action Strip ══ */}
      <div className="flex-none px-space-lg py-space-md border-b border-surface-container bg-surface-container-lowest shadow-xs flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                My Tasks
              </span>
              <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                Sprint Active
              </span>
            </div>

            <div className="h-4 w-px bg-outline-variant/30 hidden sm:block" />

            {/* Filter Pill Tabs */}
            <div className="hidden sm:flex items-center bg-surface-container-low p-0.5 rounded-lg shadow-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 font-body-sm text-body-sm transition-all rounded-md ${
                  activeFilter === "all" ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setActiveFilter("mine")}
                className={`px-2.5 py-1 font-body-sm text-body-sm transition-all rounded-md ${
                  activeFilter === "mine" ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Assigned Tasks
              </button>
            </div>
          </div>

          {/* Action Buttons & Board switcher */}
          <div className="flex items-center gap-space-sm self-start lg:self-auto">
            {/* Mode switch */}
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg shadow-xs mr-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 px-2.5 py-1 font-body-sm text-body-sm rounded-md transition-colors ${
                  viewMode === "list" ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-1 px-2.5 py-1 font-body-sm text-body-sm rounded-md transition-colors ${
                  viewMode === "board" ? "bg-surface-container-lowest text-primary font-semibold shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-base">view_kanban</span>
                <span className="hidden md:inline">Board</span>
              </button>
            </div>

            {/* AI Prioritize trigger */}
            <button
              onClick={() => openCopilot("Prioritize the current workspace tasks based on urgency and dependencies.")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors shadow-xs font-body-sm text-body-sm font-medium"
            >
              <span className="material-symbols-outlined text-base text-secondary">auto_awesome</span>
              <span>Auto-prioritize</span>
            </button>

            {/* New Task Button */}
            <button
              onClick={() => openCreateModal("TODO")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all shadow-xs active:scale-95 font-body-sm text-body-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Task</span>
              <span className="font-label-sm text-label-sm px-1 py-0.2 rounded bg-black/20 text-on-primary font-mono ml-0.5">C</span>
            </button>
          </div>
        </div>

        {/* Telemetry Velocity Bar */}
        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-secondary">trending_up</span>
            <span>Sprint Velocity: <strong className="text-on-surface">{velocity}%</strong></span>
          </div>
          <span className="text-outline font-mono">{doneCount} of {tasks.length} tasks completed</span>
        </div>
      </div>

      {/* ══ Main Workspace Area: Kanban Board or List + Detail Drawer ══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        
        {/* Kanban Board Container */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
              <span className="font-label-sm text-label-sm text-outline">Loading task board...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto p-space-lg flex gap-space-md min-h-0 bg-surface">
            {COLUMNS.map((col) => {
              const colTasks = getTasksByStatus(col.id);

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="w-72 sm:w-80 flex-shrink-0 flex flex-col gap-space-sm bg-surface-container-low/70 p-2 rounded-xl border border-surface-container"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-1.5 flex-none">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface">
                        {col.label}
                      </span>
                      <span className="font-label-sm text-label-sm px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface-variant font-mono">
                        {colTasks.length}
                      </span>
                    </div>

                    <button
                      onClick={() => openCreateModal(col.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                      title="Add task"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>

                  {/* Cards Feed */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-space-xs pr-1">
                    {colTasks.length === 0 ? (
                      <div className="p-space-lg text-center border border-dashed border-outline-variant/40 rounded-lg my-auto">
                        <p className="font-body-sm text-body-sm text-outline">Drop tasks here</p>
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const isSelected = selectedTask?.id === task.id;
                        const isDone = task.status === "DONE";
                        const isUrgent = task.priority === "URGENT";
                        const isHigh = task.priority === "HIGH";

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                            onClick={() => setSelectedTask(task)}
                            className={`group bg-surface-container-lowest p-3 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer border ${
                              isSelected ? "ring-2 ring-primary border-transparent" : "border-outline-variant/20 hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`font-label-sm text-label-sm font-mono ${isDone ? "line-through text-outline" : "text-outline"}`}>
                                TSK-{task.id?.slice(0, 4) || "100"}
                              </span>
                              <span className={`flex items-center gap-1 font-label-sm text-label-sm px-1.5 py-0.5 rounded font-medium ${
                                isUrgent ? "bg-error-container/40 text-error-stitch" :
                                isHigh ? "bg-error-container/20 text-error-stitch" :
                                "bg-surface-container-high text-on-surface-variant"
                              }`}>
                                {isUrgent && <span className="material-symbols-outlined text-xs">local_fire_department</span>}
                                {task.priority || "Medium"}
                              </span>
                            </div>

                            <h4 className={`font-body-sm text-body-sm font-medium leading-snug group-hover:text-primary transition-colors ${
                              isDone ? "line-through text-on-surface-variant" : "text-on-surface"
                            }`}>
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container text-on-surface-variant font-label-sm text-label-sm">
                              <div className="flex items-center gap-1 text-outline">
                                <span className="material-symbols-outlined text-xs">folder_open</span>
                                <span className="truncate max-w-[90px]">{task.type || "Engineering"}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-outline font-mono">
                                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "No date"}
                                </span>
                                <div className="w-5 h-5 rounded-full bg-primary-container text-on-primary font-label-sm flex items-center justify-center font-bold text-[10px]">
                                  {(task.assignee?.username || "Y").charAt(0).toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ Right Detail / Context Inspector Panel (Linear Style Flyout) ══ */}
        {selectedTask && (
          <aside className="w-96 flex-shrink-0 bg-surface-container-lowest border-l border-surface-container shadow-lg flex flex-col p-space-md gap-space-md z-20 overflow-y-auto">
            {/* Header & Fast Close */}
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md font-mono text-primary font-bold">
                  TSK-{selectedTask.id?.slice(0, 4) || "101"}
                </span>
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-primary-container/10 text-primary font-medium">
                  {selectedTask.type || "Task"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteTaskMutation.mutate(selectedTask.id)}
                  className="p-1 rounded text-outline hover:text-error-stitch hover:bg-error-container/20 transition-colors"
                  title="Delete task"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Task Title & Description */}
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight mb-2">
                {selectedTask.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {selectedTask.description || "No description provided."}
              </p>
            </div>

            {/* Linear-Style Compact Property Grid */}
            <div className="flex flex-col gap-2.5 bg-surface-container-low/60 p-3 rounded-lg text-on-surface font-body-sm text-body-sm border border-surface-container">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md">Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTask.id, data: { status: e.target.value } })}
                  className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 text-label-sm font-medium"
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="IN_REVIEW">IN REVIEW</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md">Priority</span>
                <select
                  value={selectedTask.priority}
                  onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTask.id, data: { priority: e.target.value } })}
                  className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 text-label-sm font-medium"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md">Assignee</span>
                <select
                  value={selectedTask.assignedTo || ""}
                  onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTask.id, data: { assignedTo: e.target.value || null } })}
                  className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 text-label-sm font-medium"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user?.id} value={m.user?.id}>
                      {m.user?.firstName ? `${m.user.firstName} ${m.user.lastName || ""}` : m.user?.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-label-md text-label-md">Due Date</span>
                <span className="font-mono text-label-sm text-outline">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "None"}
                </span>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 flex flex-col gap-2 pt-2 border-t border-surface-container">
              <span className="font-label-sm text-label-sm uppercase font-semibold text-outline">
                Activity &amp; Comments ({comments.length})
              </span>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-48">
                {comments.map((c) => (
                  <div key={c.id} className="p-2 rounded bg-surface-container-low text-body-sm">
                    <div className="flex items-center justify-between text-outline font-label-sm text-label-sm mb-1">
                      <span>{c.user?.username || "Teammate"}</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-on-surface">{c.content}</p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!commentText.trim()) return;
                  createCommentMutation.mutate(commentText.trim());
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-body-sm text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-2.5 h-8 bg-primary text-on-primary rounded-lg text-label-sm font-medium hover:bg-primary-container disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>

      {/* ══ Create Task Modal ══ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_task</span>
                <h3 className="text-sm font-semibold text-zinc-900">Create Task</h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Title</label>
                <input
                  className="ac-input"
                  placeholder="Task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Status</label>
                  <select
                    className="ac-select"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IN_REVIEW">IN REVIEW</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Priority</label>
                  <select
                    className="ac-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Assignee</label>
                  <select
                    className="ac-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user?.id} value={m.user?.id}>
                        {m.user?.firstName ? `${m.user.firstName} ${m.user.lastName || ""}` : m.user?.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="ac-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
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
    </div>
  );
}
