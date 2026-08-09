import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";

export default function WorkspaceDocs() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Document Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocVisibility, setNewDocVisibility] = useState("WORKSPACE");

  // Editor states
  const [docTitle, setDocTitle] = useState("");
  const [docVisibility, setDocVisibility] = useState("WORKSPACE");
  const [localBlocks, setLocalBlocks] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Fetch documents list
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/documents`).then((res) => res.data.documents),
    enabled: !!workspaceId,
  });

  // Fetch single document details (with blocks)
  const { data: docDetails, refetch: refetchDoc } = useQuery({
    queryKey: ["document", selectedDoc?.id],
    queryFn: () => api.get(`/documents/${selectedDoc.id}`).then((res) => res.data.document),
    enabled: !!selectedDoc?.id,
  });

  // Sync details to state
  useEffect(() => {
    if (docDetails) {
      setDocTitle(docDetails.title || "");
      setDocVisibility(docDetails.visibility || "WORKSPACE");
      const sortedBlocks = Array.isArray(docDetails.blocks)
        ? [...docDetails.blocks].sort((a, b) => a.position - b.position)
        : [];
      setLocalBlocks(sortedBlocks);
    }
  }, [docDetails]);

  // Mutations
  const createDocMutation = useMutation({
    mutationFn: (data) => api.post(`/workspaces/${workspaceId}/documents`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      setIsCreateModalOpen(false);
      setNewDocTitle("");
      setNewDocVisibility("WORKSPACE");
      if (res.data.document) {
        setSelectedDoc(res.data.document);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to create document.");
    }
  });

  const updateDocMutation = useMutation({
    mutationFn: (data) => api.patch(`/documents/${selectedDoc?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      refetchDoc();
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: () => api.delete(`/documents/${selectedDoc?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      setSelectedDoc(null);
    },
  });

  const updateBlocksMutation = useMutation({
    mutationFn: (blocksPayload) => api.put(`/documents/${selectedDoc?.id}/blocks`, { blocks: blocksPayload }),
    onSuccess: () => {
      refetchDoc();
      alert("Document blocks saved successfully!");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to save document blocks.");
    }
  });

  // Version History Queries & Mutations
  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["documentVersions", selectedDoc?.id],
    queryFn: () => api.get(`/documents/${selectedDoc.id}/versions`).then((res) => res.data.versions),
    enabled: !!selectedDoc?.id && isHistoryOpen,
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () => api.post(`/documents/${selectedDoc?.id}/versions`),
    onSuccess: () => {
      refetchVersions();
      alert("Version snapshot saved successfully!");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to create version snapshot.");
    }
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (versionId) => api.post(`/documents/${selectedDoc?.id}/versions/${versionId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", selectedDoc?.id] });
      alert("Document restored successfully!");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to restore version.");
    }
  });

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    createDocMutation.mutate({
      title: newDocTitle.trim(),
      visibility: newDocVisibility,
    });
  };

  const handleSaveDocMeta = () => {
    if (!docTitle.trim()) return;
    updateDocMutation.mutate({
      title: docTitle.trim(),
      visibility: docVisibility,
    });
  };

  // Block management functions
  const addBlock = (type) => {
    const lastBlock = localBlocks[localBlocks.length - 1];
    const newPosition = lastBlock ? lastBlock.position + 1000 : 1000;
    
    const newBlock = {
      id: `temp-${Date.now()}`,
      type,
      content: type === "CHECKLIST" ? JSON.stringify({ text: "New checklist item", completed: false }) : "",
      position: newPosition,
    };
    setLocalBlocks([...localBlocks, newBlock]);
  };

  const deleteBlock = (index) => {
    const nextBlocks = [...localBlocks];
    nextBlocks.splice(index, 1);
    setLocalBlocks(nextBlocks);
  };

  const updateBlockContent = (index, value) => {
    const nextBlocks = [...localBlocks];
    nextBlocks[index] = { ...nextBlocks[index], content: value };
    setLocalBlocks(nextBlocks);
  };

  const moveBlock = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === localBlocks.length - 1) return;

    const nextBlocks = [...localBlocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    const tempPos = nextBlocks[index].position;
    nextBlocks[index].position = nextBlocks[targetIndex].position;
    nextBlocks[targetIndex].position = tempPos;

    const tempObj = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIndex];
    nextBlocks[targetIndex] = tempObj;

    setLocalBlocks(nextBlocks);
  };

  const handleSaveBlocks = () => {
    const payload = localBlocks.map((b) => {
      const item = {
        type: b.type,
        content: b.content,
        position: b.position,
      };
      if (b.id && !b.id.startsWith("temp-")) {
        item.id = b.id;
      }
      return item;
    });
    updateBlocksMutation.mutate(payload);
  };

  if (selectedDoc) {
    return (
      <div className="h-full flex flex-col bg-white overflow-hidden">
        {/* Doc Header */}
        <div className="shrink-0 px-8 py-4 border-b border-border flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDoc(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onBlur={handleSaveDocMeta}
                className="text-base font-semibold text-zinc-900 bg-transparent border-b-2 border-transparent focus:border-primary outline-none pb-0.5 transition-colors"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={docVisibility}
                  onChange={(e) => {
                    setDocVisibility(e.target.value);
                    updateDocMutation.mutate({ visibility: e.target.value });
                  }}
                  className="text-xs text-zinc-400 bg-transparent outline-none cursor-pointer"
                >
                  <option value="WORKSPACE">Workspace Visible</option>
                  <option value="PUBLIC">Public Access</option>
                  <option value="PRIVATE">Private Doc</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`h-9 px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isHistoryOpen
                  ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                  : "bg-white border-border text-zinc-650 hover:bg-zinc-50"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              History
            </button>
            <button
              onClick={() => createSnapshotMutation.mutate()}
              disabled={createSnapshotMutation.isPending}
              className="h-9 px-3 border border-border bg-white hover:bg-zinc-50 rounded-lg text-xs font-semibold text-zinc-650 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              Snapshot
            </button>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this document?")) {
                  deleteDocMutation.mutate();
                }
              }}
              className="btn-danger h-9 px-4 text-sm"
            >
              Delete
            </button>
            <button
              onClick={handleSaveBlocks}
              disabled={updateBlocksMutation.isPending}
              className="btn-primary h-9 px-4 text-sm"
            >
              {updateBlocksMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* E2E Split Screen Layout for Editor & History */}
        <div className="flex-1 flex overflow-hidden">
          {/* Notion-style Content Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar border-r border-border">
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-2 relative">
            {localBlocks.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-zinc-300 text-sm">Start writing — add a block below ↓</p>
              </div>
            )}

            {localBlocks.map((block, idx) => (
              <div key={block.id} className="group relative">
                {/* Block Controls */}
                <div className="absolute -right-14 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border border-border shadow-sm p-1 rounded-lg z-10">
                  <button
                    onClick={() => moveBlock(idx, "up")}
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer text-xs"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveBlock(idx, "down")}
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer text-xs"
                    title="Move down"
                  >▼</button>
                  <button
                    onClick={() => deleteBlock(idx)}
                    className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer text-xs"
                    title="Delete block"
                  >✕</button>
                </div>

                {/* HEADING */}
                {block.type === "HEADING" && (
                  <input
                    type="text"
                    value={block.content}
                    placeholder="Heading"
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    className="w-full text-2xl font-bold text-zinc-900 bg-transparent outline-none border-none placeholder:text-zinc-200 py-1"
                  />
                )}

                {/* PARAGRAPH */}
                {block.type === "PARAGRAPH" && (
                  <textarea
                    value={block.content}
                    placeholder="Write something..."
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    className="w-full text-sm text-zinc-700 leading-relaxed bg-transparent outline-none resize-none no-scrollbar min-h-[28px] placeholder:text-zinc-300 py-1"
                    rows={Math.max(2, block.content?.split("\n").length || 1)}
                  />
                )}

                {/* CODE */}
                {block.type === "CODE" && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-950 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    </div>
                    <textarea
                      value={block.content}
                      placeholder="// Write code here..."
                      onChange={(e) => updateBlockContent(idx, e.target.value)}
                      className="w-full font-mono text-sm text-teal-300 bg-transparent p-4 outline-none min-h-[80px] resize-y"
                    />
                  </div>
                )}

                {/* QUOTE */}
                {block.type === "QUOTE" && (
                  <div className="flex gap-3 border-l-4 border-primary/40 pl-4 py-1">
                    <textarea
                      value={block.content}
                      placeholder="Quote..."
                      onChange={(e) => updateBlockContent(idx, e.target.value)}
                      className="flex-1 text-sm text-zinc-500 italic bg-transparent outline-none resize-none placeholder:text-zinc-300"
                    />
                  </div>
                )}

                {/* CHECKLIST */}
                {block.type === "CHECKLIST" && (
                  <div className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={(() => {
                        try { return !!JSON.parse(block.content).completed; } catch { return false; }
                      })()}
                      onChange={(e) => {
                        let text = "Checklist item";
                        try { text = JSON.parse(block.content).text; } catch {}
                        updateBlockContent(idx, JSON.stringify({ text, completed: e.target.checked }));
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                    />
                    <input
                      type="text"
                      value={(() => {
                        try { return JSON.parse(block.content).text || ""; } catch { return block.content; }
                      })()}
                      onChange={(e) => {
                        let completed = false;
                        try { completed = JSON.parse(block.content).completed; } catch {}
                        updateBlockContent(idx, JSON.stringify({ text: e.target.value, completed }));
                      }}
                      className="flex-1 text-sm text-zinc-700 bg-transparent outline-none border-none placeholder:text-zinc-300"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Add Block Toolbar */}
            <div className="pt-8 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Add block</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: "HEADING", icon: "H", label: "Heading" },
                  { type: "PARAGRAPH", icon: "¶", label: "Text" },
                  { type: "CHECKLIST", icon: "✓", label: "Checklist" },
                  { type: "CODE", icon: "</>", label: "Code" },
                  { type: "QUOTE", icon: '"', label: "Quote" },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addBlock(item.type)}
                    className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-zinc-50 hover:border-zinc-300 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="text-zinc-400 font-mono text-xs">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Version History Sidebar */}
        {isHistoryOpen && (
          <div className="w-[280px] bg-zinc-50 border-l border-border shrink-0 flex flex-col h-full animate-in slide-in-from-right duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-white shrink-0">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Version History</h4>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {versions.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-8">No saved snapshots yet.</p>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-lg border border-border bg-white hover:border-primary/20 hover:shadow-sm transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800">Version {ver.version}</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(ver.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Saved by @{ver.editor?.username || "member"}
                    </p>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to restore to Version ${ver.version}?`)) {
                          restoreVersionMutation.mutate(ver.id);
                        }
                      }}
                      disabled={restoreVersionMutation.isPending}
                      className="w-full h-7 rounded border border-violet-200 hover:bg-violet-50 text-[10px] font-semibold text-violet-600 transition-colors cursor-pointer"
                    >
                      {restoreVersionMutation.isPending ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Documents</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Workspace knowledge base and project docs</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary h-9 px-4 text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Document
        </button>
      </div>

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-zinc-400">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 border border-border flex items-center justify-center text-zinc-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-zinc-700">No documents yet</h4>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">Create your first document to start building your team's knowledge base.</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary mt-4 h-9 px-4 text-sm">
              Create Document
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-white hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-zinc-50 border border-border flex items-center justify-center shrink-0 group-hover:border-zinc-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-zinc-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 transition-colors truncate">{doc.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 capitalize">{doc.visibility?.toLowerCase()} · {doc._count?.blocks || 0} blocks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-400">
                    {new Date(doc.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Document Modal ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-zinc-900">Create Document</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Product Roadmap"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="ac-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Visibility</label>
                <select
                  value={newDocVisibility}
                  onChange={(e) => setNewDocVisibility(e.target.value)}
                  className="ac-select"
                >
                  <option value="WORKSPACE">Workspace — everyone in workspace can view</option>
                  <option value="PUBLIC">Public — anyone with the link</option>
                  <option value="PRIVATE">Private — invite only</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex-1"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={createDocMutation.isPending}
                  className="btn-primary flex-1"
                >
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
