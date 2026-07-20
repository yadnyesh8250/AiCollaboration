import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceTasks() {
  const { workspaceId } = useParams();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/tasks`).then((res) => res.data.tasks),
    enabled: !!workspaceId,
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

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Skynet Project Board</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Manage and prioritize project deliverables</p>
        </div>
        <button className="h-9 px-4 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
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
  );
}
