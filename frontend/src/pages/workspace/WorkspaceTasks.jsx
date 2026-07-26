import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

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
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((res) => res.data.tasks),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((res) => res.data.members),
    enabled: !!workspaceId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["taskComments", editingTask?.id],
    queryFn: () => api.get(`/tasks/${editingTask?.id}/comments`).then((res) => res.data.comments),
    enabled: !!editingTask?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: (content) => api.post(`/tasks/${editingTask?.id}/comments`, { content }),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      setIsModalOpen(false);
      setEditingTask(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      setIsModalOpen(false);
      // Reset form fields
      setTitle("");
      setDescription("");
      setStatusVal("TODO");
      setPriority("MEDIUM");
      setType("TASK");
      setAssignedTo("");
      setDueDate("");
      setEstimatedHours("");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      setIsModalOpen(false);
      setEditingTask(null);
      // Reset form fields
      setTitle("");
      setDescription("");
      setStatusVal("TODO");
      setPriority("MEDIUM");
      setType("TASK");
      setAssignedTo("");
      setDueDate("");
      setEstimatedHours("");
    },
  });

  const getTasksByStatus = (status) => (Array.isArray(tasks) ? tasks.filter((t) => t.status === status) : []);

  const columns = [
    {
      name: "To Do",
      status: "TODO",
      color: "bg-zinc-600",
      tasks: getTasksByStatus("TODO"),
    },
    {
      name: "In Progress",
      status: "IN_PROGRESS",
      color: "bg-purple-500",
      tasks: getTasksByStatus("IN_PROGRESS"),
    },
    {
      name: "In Review",
      status: "IN_REVIEW",
      color: "bg-amber-500",
      tasks: getTasksByStatus("IN_REVIEW"),
    },
    {
      name: "Done",
      status: "DONE",
      color: "bg-emerald-500",
      tasks: getTasksByStatus("DONE"),
    },
  ];

  const getPriorityDot = (pr) => {
    switch (pr) {
      case "URGENT": return <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />;
      case "HIGH": return <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />;
      case "MEDIUM": return <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />;
      default: return <span className="h-1.5 w-1.5 rounded-full bg-zinc-650 shrink-0" />;
    }
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

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatusVal("TODO");
    setPriority("MEDIUM");
    setType("TASK");
    setAssignedTo("");
    setDueDate("");
    setEstimatedHours("");
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatusVal(task.status || "TODO");
    setPriority(task.priority || "MEDIUM");
    setType(task.type || "TASK");
    setAssignedTo(task.assignedTo || "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
    setEstimatedHours(task.estimatedHours !== null && task.estimatedHours !== undefined ? task.estimatedHours.toString() : "");
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="p-6 space-y-6 h-full flex flex-col selection:bg-primary/20 selection:text-white">
        {/* Header Section */}
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white select-none">Skynet Board</h2>
            <p className="text-[11px] text-zinc-550 font-medium">Manage and prioritize project milestones</p>
          </div>
          <button
            onClick={openCreateModal}
            className="h-8 px-3 rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
          >
            Add Task
          </button>
        </div>

        {/* Kanban Board Container */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-zinc-650 animate-pulse font-bold">Loading tasks...</span>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto min-h-0 pr-1 no-scrollbar select-none">
            {columns.map((col) => (
              <div key={col.name} className="flex flex-col h-full bg-[#050505] rounded-xl border border-zinc-950 p-3 space-y-3 min-h-[350px]">
                {/* Column Title */}
                <div className="flex justify-between items-center shrink-0 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.color}`} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{col.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600 bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">
                    {col.tasks.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 no-scrollbar">
                  {col.tasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center border border-dashed border-zinc-900/50 rounded-xl p-6">
                      <span className="text-[10px] text-zinc-650 italic font-semibold">No tasks</span>
                    </div>
                  ) : (
                    col.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openEditModal(task)}
                        className="bg-zinc-950/40 hover:bg-zinc-900/10 border border-zinc-950 hover:border-zinc-900 rounded-xl p-3.5 space-y-3 transition-all cursor-pointer shadow-sm group hover:-translate-y-0.5 duration-200"
                      >
                        <p className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors leading-relaxed">
                          {task.title}
                        </p>
                        
                        <div className="flex items-center justify-between text-[8px] font-bold">
                          <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-1">
                              {getPriorityDot(task.priority)}
                              <span className="text-zinc-550 uppercase tracking-wider">{task.priority}</span>
                            </div>
                            <span className="text-zinc-650 font-mono tracking-widest">{task.type}</span>
                          </div>
                          
                          <span className="text-zinc-600 font-medium">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "No due date"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Creation & Editor Modal Popups */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {editingTask ? "Task details" : "Create new task"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-650 hover:text-white cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Task title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-base font-bold text-white bg-transparent outline-none border-b border-transparent focus:border-zinc-900 pb-1"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Description</label>
                  <textarea
                    placeholder="Provide details about the work..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[60px] rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 py-2 text-xs text-foreground placeholder:text-zinc-600/70 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all resize-none"
                  />
                </div>

                {/* Dropdowns row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      <option value="TASK">Task</option>
                      <option value="BUG">Bug</option>
                      <option value="FEATURE">Feature</option>
                      <option value="STORY">Story</option>
                      <option value="EPIC">Epic</option>
                      <option value="SUBTASK">Subtask</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Status</label>
                    <select
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value)}
                      className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                </div>

                {/* Assignee & Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Assignee</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-2 text-xs text-zinc-350 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.userId}>
                          {m.user?.username || m.userId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-zinc-300 outline-none focus:border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Est Hours */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0.0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground placeholder:text-zinc-600/70 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all"
                  />
                </div>

                {/* Actions row */}
                <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
                  <div>
                    {editingTask && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this task?")) {
                            deleteTaskMutation.mutate(editingTask.id);
                          }
                        }}
                        disabled={deleteTaskMutation.isPending}
                        className="h-8 px-3.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-900/25 text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-55 transition-all cursor-pointer"
                      >
                        {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="h-8 px-3.5 rounded-lg border border-zinc-900 hover:bg-zinc-900/30 text-xs font-semibold text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                      className="h-8 px-3.5 rounded-lg bg-white text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {editingTask ? (updateTaskMutation.isPending ? "Saving..." : "Save Changes") : (createTaskMutation.isPending ? "Creating..." : "Create Task")}
                    </button>
                  </div>
                </div>
              </form>

              {/* Comments Feed Section */}
              {editingTask && (
                <div className="border-t border-zinc-900 pt-4 space-y-3.5">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Comments ({comments.length})</h4>
                  
                  {/* Comments list */}
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-zinc-650 italic font-semibold pl-1">No comments yet. Start the conversation!</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="bg-zinc-950/30 border border-zinc-900/80 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] font-bold">
                            <div className="flex items-center gap-2">
                              <div className="h-4.5 w-4.5 rounded-full bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-400 flex items-center justify-center uppercase shrink-0">
                                {c.author?.username?.substring(0, 2) || "U"}
                              </div>
                              <span className="text-zinc-350">{c.author?.username || "user"}</span>
                            </div>
                            <span className="text-zinc-600 font-medium">
                              {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed pl-6.5">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment box */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) {
                          e.preventDefault();
                          createCommentMutation.mutate(commentText.trim());
                        }
                      }}
                      className="flex-1 h-8.5 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground placeholder:text-zinc-600/70 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (commentText.trim()) {
                          createCommentMutation.mutate(commentText.trim());
                        }
                      }}
                      disabled={createCommentMutation.isPending || !commentText.trim()}
                      className="h-8.5 px-3 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {createCommentMutation.isPending ? "Posting..." : "Post"}
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
