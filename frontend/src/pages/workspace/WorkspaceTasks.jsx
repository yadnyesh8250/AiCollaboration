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
      badge: getTasksByStatus("TODO").length.toString(),
      tasks: getTasksByStatus("TODO"),
    },
    {
      name: "In Progress",
      badge: getTasksByStatus("IN_PROGRESS").length.toString(),
      tasks: getTasksByStatus("IN_PROGRESS"),
    },
    {
      name: "Review",
      badge: getTasksByStatus("IN_REVIEW").length.toString(),
      tasks: getTasksByStatus("IN_REVIEW"),
    },
    {
      name: "Done",
      badge: getTasksByStatus("DONE").length.toString(),
      tasks: getTasksByStatus("DONE"),
    },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "URGENT": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "HIGH": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "MEDIUM": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700/60";
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
      <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Skynet Project Board</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Manage and prioritize project deliverables</p>
        </div>
        <button
          onClick={openCreateModal}
          className="h-9 px-4 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          Add Task
        </button>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-y-auto min-h-0 pr-1">
        {columns.map((col) => (
          <div key={col.name} className="flex flex-col h-full bg-zinc-950/20 rounded-xl border border-zinc-900/40 p-3 space-y-3 min-h-[400px]">
            <div className="flex justify-between items-center shrink-0 px-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{col.name}</span>
              <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                {col.badge}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => openEditModal(task)}
                  className="bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/60 rounded-xl p-3.5 space-y-3 transition-all cursor-pointer shadow-sm group"
                >
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-foreground transition-colors leading-relaxed">
                    {task.title}
                  </p>
                  
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <div className="flex gap-1.5 items-center">
                      <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-zinc-500 uppercase tracking-widest">{task.type}</span>
                    </div>
                    <span className="text-zinc-500 font-medium">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "No due date"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

      {/* Task Creation Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h3 className="text-base font-bold text-foreground">
                {editingTask ? "Edit Task" : "Create New Task"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-foreground cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-3 text-xs text-foreground placeholder:text-zinc-500/60 outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description (Optional)</label>
                <textarea
                  placeholder="Describe details of the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[70px] rounded-lg border border-zinc-850 bg-zinc-950 px-3 py-2 text-xs text-foreground placeholder:text-zinc-500/60 outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Type, Priority, Status dropdown inline */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date inline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Assignee</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-3 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Est Hours */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Estimated hours..."
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-3 text-xs text-foreground placeholder:text-zinc-500/60 outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-zinc-800 hover:bg-zinc-900/40 text-xs font-semibold text-zinc-400 hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  className="h-9 px-4 rounded-lg bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {editingTask ? (updateTaskMutation.isPending ? "Saving..." : "Save Changes") : (createTaskMutation.isPending ? "Creating..." : "Create Task")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
