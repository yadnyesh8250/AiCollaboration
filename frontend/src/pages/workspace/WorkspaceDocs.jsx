import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceDocs() {
  const { workspaceId } = useParams();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Finalize database schema", completed: true },
    { id: 2, text: "Configure Prisma adapter models", completed: false },
    { id: 3, text: "Audit socket payload schemas", completed: false },
  ]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/documents`).then((res) => res.data.documents),
    enabled: !!workspaceId,
  });

  const handleToggleCheck = (id) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  if (selectedDoc) {
    return (
      <div className="p-6 space-y-6 h-full flex flex-col bg-zinc-950/20 text-foreground overflow-hidden">
        {/* Doc Header */}
        <div className="flex items-center justify-between shrink-0 bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-zinc-500 hover:text-foreground cursor-pointer p-1 rounded hover:bg-zinc-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                📄 {selectedDoc.title}
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium">Collaborative document editing view</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg hover:text-white transition-colors cursor-pointer">
              Share
            </button>
            <button className="text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              History
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 relative">
          {/* Doc Title with simulated Purple Sarah Jenkins Cursor */}
          <div className="relative group p-2 border border-transparent hover:border-purple-500/20 rounded-lg transition-colors">
            <h1 className="text-2xl font-black text-foreground tracking-tight select-none">
              System Architecture
            </h1>
            {/* Sarah Jenkins Cursor Overlay */}
            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 flex flex-col items-start pointer-events-none select-none z-20">
              <span className="h-4 w-0.5 bg-purple-500 animate-pulse" />
              <div className="bg-purple-500 text-purple-950 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg translate-y-1">
                Sarah Jenkins
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl select-none">
            System Architecture is a framework and development plan for orchestrating real-time socket connections, database scaling components, and asynchronous task workers.
          </p>

          {/* Subheading */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-zinc-200">Headings & Standards</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl select-none">
              Consists of structurally collaborative patterns mapping task lists, user metrics, and communication endpoints.
            </p>
          </div>

          {/* Collaborative Code Block */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 font-mono text-[11px] text-zinc-300 relative select-none">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900 mb-3 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
              <span>code preview</span>
              <span>js</span>
            </div>
            <pre className="space-y-1">
              <div><span className="text-purple-400">export default function</span> <span className="text-teal-400">Architecture</span>() &#123;</div>
              <div>  <span className="text-purple-400">const</span> users = <span className="text-amber-300">'interactive-presence'</span>;</div>
              <div>  <span className="text-purple-400">return</span> name: <span className="text-amber-300">'architecture-schema'</span>;</div>
              <div>&#125;;</div>
            </pre>
          </div>

          {/* Checklist with simulated Orange Mike Dev Cursor */}
          <div className="space-y-3 relative p-2 border border-transparent hover:border-amber-500/20 rounded-lg transition-colors">
            <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Sprint Action Items</h3>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleCheck(item.id)}
                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-primary focus:ring-primary/40 cursor-pointer"
                  />
                  <span className={`text-xs ${item.completed ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Mike Dev Cursor Overlay on checklist */}
            <div className="absolute right-1/3 bottom-4 flex flex-col items-start pointer-events-none select-none z-20">
              <span className="h-4 w-0.5 bg-amber-500 animate-pulse" />
              <div className="bg-amber-500 text-amber-950 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg translate-y-1">
                Mike Dev
              </div>
            </div>
          </div>

          {/* Simple collaborative diagram */}
          <div className="border border-zinc-900 bg-zinc-950/20 rounded-xl p-6 flex flex-col items-center justify-center space-y-4 shrink-0">
            <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Architecture Flow</h4>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-zinc-300">
              <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">Web App</div>
              <span className="text-zinc-600">→</span>
              <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">API Server</div>
              <span className="text-zinc-600">→</span>
              <div className="bg-zinc-950 border border-zinc-850 px-4 py-2 rounded-lg">Cloud Database</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Documents</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Collaborative project briefs and specification documents</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {Array.isArray(documents) && documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 hover:border-zinc-700/60 bg-zinc-900/10 hover:bg-zinc-900/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-foreground transition-colors">{doc.title}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Updated by {doc.creator?.username || doc.createdBy || "Unknown"}</p>
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              {new Date(doc.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
