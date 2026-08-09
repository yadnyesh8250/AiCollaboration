import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", dot: "bg-red-500", badge: "ac-badge ac-badge-red" },
  HIGH:   { label: "High",   dot: "bg-amber-500", badge: "ac-badge ac-badge-amber" },
  MEDIUM: { label: "Medium", dot: "bg-blue-500", badge: "ac-badge bg-blue-50 text-blue-700 border border-blue-200" },
  LOW:    { label: "Low",    dot: "bg-zinc-300", badge: "ac-badge ac-badge-gray" },
};

const COLUMNS = [
  { id: "TODO",        label: "Backlog",     accent: "bg-zinc-400",  header: "bg-zinc-50 border-zinc-200" },
  { id: "IN_PROGRESS", label: "In Progress", accent: "bg-blue-500",  header: "bg-blue-50 border-blue-200" },
  { id: "IN_REVIEW",   label: "In Review",   accent: "bg-amber-500", header: "bg-amber-50 border-amber-200" },
  { id: "DONE",        label: "Done",        accent: "bg-green-500", header: "bg-green-50 border-green-200" },
];

export default function WorkspaceTasks() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusVal, setStatusVal] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [type, setType] = useState("TASK");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((r) => r.data.tasks),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data.members),
    enabled: !!workspaceId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["taskComments", editingTask?.id],
    queryFn: () => api.get(`/tasks/${editingTask?.id}/comments`).then((r) => r.data.comments),
    enabled: !!editingTask?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: (content) => api.post(`/tasks/${editingTask?.id}/comments`, { content }),
    onSuccess: () => { refetchComments(); setCommentText(""); },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      closeModal();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] }); closeModal(); },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] }); closeModal(); },
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setStatusVal("TODO"); setPriority("MEDIUM");
    setType("TASK"); setAssignedTo(""); setDueDate(""); setEstimatedHours("");
  };

  const closeModal = () => { setIsModalOpen(false); setEditingTask(null); resetForm(); };

  const openCreateModal = () => { setEditingTask(null); resetForm(); setIsModalOpen(true); };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatusVal(task.status || "TODO");
    setPriority(task.priority || "MEDIUM");
    setType(task.type || "TASK");
    setAssignedTo(task.assignedTo || "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setEstimatedHours(task.estimatedHours != null ? task.estimatedHours.toString() : "");
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
      type,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
    };
    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, data: payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const getTasksByStatus = (status) => (Array.isArray(tasks) ? tasks.filter((t) => t.status === status) : []);

  const FormLabel = ({ children }) => (
    <label className="block text-xs font-medium text-zinc-600 mb-1.5">{children}</label>
  );

  return (
    <>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Task Board</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} across {COLUMNS.length} stages
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary h-9 px-4 text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Kanban board */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto p-6 min-h-0">
            <div className="flex gap-4 h-full min-w-[800px]">
              {COLUMNS.map((col) => {
                const colTasks = getTasksByStatus(col.id);
                return (
                  <div key={col.id} className="flex flex-col flex-1 min-w-[220px] max-w-xs bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${col.header} shrink-0`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${col.accent} shrink-0`} />
                        <span className="text-sm font-semibold text-zinc-700">{col.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-2 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <p className="text-sm text-zinc-400 font-medium">No tasks here</p>
                          <p className="text-xs text-zinc-300 mt-1">Drag tasks or create new ones</p>
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                          return (
                            <div
                              key={task.id}
                              onClick={() => openEditModal(task)}
                              className="bg-white border border-border rounded-xl p-4 space-y-3 cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all duration-150 group"
                            >
                              <p className="text-sm font-medium text-zinc-800 leading-snug group-hover:text-zinc-900 transition-colors">
                                {task.title}
                              </p>

                              <div className="flex items-center justify-between gap-2">
                                <span className={p.badge}>{p.label}</span>
                                {task.dueDate && (
                                  <span className="text-xs text-zinc-400 font-medium">
                                    {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>

                              {task.assignedTo && (
                                <div className="flex items-center gap-1.5 pt-1">
                                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                                    {(members.find((m) => m.userId === task.assignedTo)?.user?.username || "?").substring(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-zinc-400">
                                    {members.find((m) => m.userId === task.assignedTo)?.user?.username || "Assigned"}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Add task shortcut */}
                      <button
                        onClick={openCreateModal}
                        className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 hover:bg-white transition-all cursor-pointer"
                      >
                        + Add task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ Task Modal ══ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-zinc-900">
                {editingTask ? "Edit Task" : "Create Task"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Task title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-lg font-semibold text-zinc-900 bg-transparent outline-none border-b-2 border-transparent focus:border-primary pb-2 transition-colors placeholder:text-zinc-300"
                  />
                </div>

                {/* Description */}
                <div>
                  <FormLabel>Description <span className="text-zinc-400 font-normal">(optional)</span></FormLabel>
                  <textarea
                    placeholder="Provide details about the work..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="ac-textarea min-h-[80px]"
                  />
                </div>

                {/* Type, Priority, Status */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FormLabel>Type</FormLabel>
                    <select className="ac-select text-sm h-10" value={type} onChange={(e) => setType(e.target.value)}>
                      {["TASK", "BUG", "FEATURE", "STORY", "EPIC", "SUBTASK"].map((t) => (
                        <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FormLabel>Priority</FormLabel>
                    <select className="ac-select text-sm h-10" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FormLabel>Status</FormLabel>
                    <select className="ac-select text-sm h-10" value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                      <option value="TODO">Backlog</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                </div>

                {/* Assignee + Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>Assignee</FormLabel>
                    <select className="ac-select text-sm h-10" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.userId}>{m.user?.username || m.userId}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FormLabel>Due Date</FormLabel>
                    <input type="date" className="ac-input text-sm h-10" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Estimated hours */}
                <div>
                  <FormLabel>Estimated Hours</FormLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0.0"
                    className="ac-input text-sm h-10"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    {editingTask && (
                      <button
                        type="button"
                        onClick={() => { if (confirm("Delete this task?")) deleteTaskMutation.mutate(editingTask.id); }}
                        disabled={deleteTaskMutation.isPending}
                        className="btn-danger h-9 px-3 text-sm"
                      >
                        {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={closeModal} className="btn-secondary h-9 px-4 text-sm">Cancel</button>
                    <button
                      type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                      className="btn-primary h-9 px-4 text-sm"
                    >
                      {editingTask
                        ? (updateTaskMutation.isPending ? "Saving..." : "Save Changes")
                        : (createTaskMutation.isPending ? "Creating..." : "Create Task")}
                    </button>
                  </div>
                </div>
              </form>

              {/* Comments (edit mode only) */}
              {editingTask && (
                <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-900">Comments {comments.length > 0 && `(${comments.length})`}</h4>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto no-scrollbar">
                    {comments.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">No comments yet. Start the discussion.</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="bg-zinc-50 border border-border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                {(c.author?.username || "U").substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-zinc-800">{c.author?.username || "User"}</span>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 leading-relaxed pl-8">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="ac-input flex-1 h-10 text-sm"
                      placeholder="Add a comment... (Enter to send)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          e.preventDefault();
                          createCommentMutation.mutate(commentText.trim());
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => commentText.trim() && createCommentMutation.mutate(commentText.trim())}
                      disabled={createCommentMutation.isPending || !commentText.trim()}
                      className="btn-primary h-10 px-4 text-sm"
                    >
                      {createCommentMutation.isPending ? "..." : "Post"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
