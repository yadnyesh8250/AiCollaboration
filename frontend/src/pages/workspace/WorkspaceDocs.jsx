import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../services/api/client";
import { useUIStore } from "../../stores/uiStore";

/* ══════════════════════════════════════════════════════
   A-Collab Document Editor & Knowledge Base
   Stitch Workspace OS Design System
   ══════════════════════════════════════════════════════ */
export default function WorkspaceDocs() {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const { openCopilot } = useUIStore();
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

  // Auto-select first doc if none selected
  useEffect(() => {
    if (!selectedDoc && documents.length > 0) {
      setSelectedDoc(documents[0]);
    }
  }, [documents, selectedDoc]);

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
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to create version snapshot.");
    }
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (versionId) => api.post(`/documents/${selectedDoc?.id}/versions/${versionId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", selectedDoc?.id] });
      refetchDoc();
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
    if (!docTitle.trim() || !selectedDoc) return;
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
    const updated = [...localBlocks, newBlock];
    setLocalBlocks(updated);

    // Auto-save blocks
    const payload = updated.map((b) => ({
      type: b.type,
      content: b.content,
      position: b.position,
      ...(b.id && !b.id.startsWith("temp-") ? { id: b.id } : {})
    }));
    updateBlocksMutation.mutate(payload);
  };

  const deleteBlock = (index) => {
    const nextBlocks = [...localBlocks];
    nextBlocks.splice(index, 1);
    setLocalBlocks(nextBlocks);
    const payload = nextBlocks.map((b) => ({
      type: b.type,
      content: b.content,
      position: b.position,
      ...(b.id && !b.id.startsWith("temp-") ? { id: b.id } : {})
    }));
    updateBlocksMutation.mutate(payload);
  };

  const updateBlockContent = (index, value) => {
    const nextBlocks = [...localBlocks];
    nextBlocks[index] = { ...nextBlocks[index], content: value };
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

  return (
    <div className="flex flex-col h-full bg-surface-ws overflow-hidden select-none">
      
      {/* ══ Top Document Sub-Header & Action Controls Bar ══ */}
      <div className="sticky top-0 z-20 w-full bg-surface-container-lowest shadow-xs border-b border-surface-container px-space-lg py-space-sm flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm truncate">
            <span className="font-semibold text-primary">Documents</span>
            <span className="material-symbols-outlined text-xs text-outline">chevron_right</span>
            <select
              value={selectedDoc?.id || ""}
              onChange={(e) => {
                const found = documents.find((d) => d.id === e.target.value);
                if (found) setSelectedDoc(found);
              }}
              className="bg-transparent font-medium text-on-surface outline-none cursor-pointer truncate max-w-[200px]"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant hidden sm:inline-block" />

          <div className="hidden lg:flex items-center gap-1 text-on-surface-variant font-caption text-caption">
            <span>{selectedDoc?.updatedAt ? `Saved ${new Date(selectedDoc.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Autosaved"}</span>
            <span className="text-secondary font-medium">• v{versions.length || 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span className="hidden sm:inline">New Doc</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-body-sm text-body-sm transition-colors ${
              isHistoryOpen ? "bg-primary text-on-primary shadow-xs" : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span className="hidden md:inline">Version History</span>
          </button>

          <button
            onClick={() => openCopilot(`Help me review or draft section for document: "${docTitle}"`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim font-body-sm text-body-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          <div className="h-4 w-px bg-surface-container-highest mx-0.5" />

          <button
            onClick={handleSaveBlocks}
            disabled={updateBlocksMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-body-sm font-semibold transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>{updateBlocksMutation.isPending ? "Saving..." : "Save"}</span>
          </button>

          {selectedDoc && (
            <button
              onClick={() => {
                if (confirm("Delete this document?")) {
                  deleteDocMutation.mutate();
                }
              }}
              className="p-1.5 rounded-lg text-outline hover:text-error-stitch hover:bg-error-container/20 transition-colors"
              title="Delete Document"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* ══ Workspace Container: Editor + Right Version Drawer ══ */}
      <div className="relative flex flex-1 min-h-0 bg-surface">
        
        {/* Center Notion Canvas */}
        <div className="flex-1 overflow-y-auto px-space-md sm:px-space-xl py-space-xl flex justify-center no-scrollbar">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
              <span className="font-label-sm text-label-sm text-outline">Loading document...</span>
            </div>
          ) : !selectedDoc ? (
            <div className="py-20 text-center space-y-3">
              <span className="material-symbols-outlined text-outline text-4xl">description</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">No Document Selected</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Create a document to start writing your team knowledge base.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-semibold"
              >
                Create Document
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[840px] bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 p-6 sm:p-10 md:p-12 mb-20 space-y-space-md h-fit">
              
              {/* Document Header & Icon */}
              <div className="flex flex-col gap-space-md mb-space-lg">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-2xl shadow-xs select-none">
                    📄
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      In Review
                    </span>
                    <span className="text-on-surface-variant font-caption text-caption uppercase">
                      KB-{selectedDoc.id?.slice(0, 4) || "DOC"}
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  onBlur={handleSaveDocMeta}
                  className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-tight bg-transparent border-none outline-none placeholder:text-outline/40 w-full"
                  placeholder="Document Title..."
                />

                {/* Notion-style Properties Table */}
                <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-2 border border-surface-container">
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center text-body-sm font-body-sm gap-1">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">visibility</span> Visibility
                    </span>
                    <div className="sm:col-span-3">
                      <select
                        value={docVisibility}
                        onChange={(e) => {
                          setDocVisibility(e.target.value);
                          updateDocMutation.mutate({ visibility: e.target.value });
                        }}
                        className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-medium border-none outline-none cursor-pointer"
                      >
                        <option value="WORKSPACE">Workspace Visible</option>
                        <option value="PUBLIC">Public Access</option>
                        <option value="PRIVATE">Private Document</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center text-body-sm font-body-sm gap-1">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">person</span> Author
                    </span>
                    <div className="sm:col-span-3 text-on-surface font-medium text-body-sm">
                      {selectedDoc.author?.firstName ? `${selectedDoc.author.firstName} ${selectedDoc.author.lastName || ""}` : selectedDoc.author?.username || "You"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blocks Stream */}
              <div className="space-y-4">
                {localBlocks.length === 0 && (
                  <div className="py-10 text-center border-2 border-dashed border-outline-variant/30 rounded-xl">
                    <p className="font-body-md text-body-md text-outline">Add blocks below to build your document</p>
                  </div>
                )}

                {localBlocks.map((block, idx) => (
                  <div key={block.id || idx} className="group relative">
                    {/* Hover Block Controls */}
                    <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-surface-container-lowest border border-outline-variant/30 shadow-xs p-1 rounded-lg z-10">
                      <button
                        onClick={() => deleteBlock(idx)}
                        className="p-1 text-error-stitch hover:bg-error-container/20 rounded text-xs"
                        title="Delete block"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>

                    {/* HEADING */}
                    {block.type === "HEADING" && (
                      <input
                        type="text"
                        value={block.content}
                        placeholder="Section Heading..."
                        onChange={(e) => updateBlockContent(idx, e.target.value)}
                        className="w-full font-headline-md text-headline-md text-on-surface bg-transparent outline-none border-b border-transparent focus:border-primary py-1"
                      />
                    )}

                    {/* PARAGRAPH */}
                    {block.type === "PARAGRAPH" && (
                      <textarea
                        value={block.content}
                        placeholder="Write content or press Ask AI to generate..."
                        onChange={(e) => updateBlockContent(idx, e.target.value)}
                        className="w-full text-body-md font-body-md text-on-surface leading-relaxed bg-transparent outline-none resize-none no-scrollbar py-1"
                        rows={Math.max(2, block.content?.split("\n").length || 1)}
                      />
                    )}

                    {/* CODE */}
                    {block.type === "CODE" && (
                      <div className="rounded-xl bg-inverse-surface text-inverse-on-surface p-space-sm font-mono text-label-md overflow-hidden shadow-xs">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-inverse-on-surface/10 text-tertiary-fixed-dim text-label-sm">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">code</span> Code block
                          </span>
                        </div>
                        <textarea
                          value={block.content}
                          placeholder="// Write code, SQL, or commands..."
                          onChange={(e) => updateBlockContent(idx, e.target.value)}
                          className="w-full font-mono text-label-md text-secondary-fixed bg-transparent outline-none resize-y min-h-[70px]"
                        />
                      </div>
                    )}

                    {/* QUOTE */}
                    {block.type === "QUOTE" && (
                      <div className="flex gap-3 border-l-4 border-primary pl-4 py-1.5 bg-surface-container-low/40 rounded-r-lg">
                        <textarea
                          value={block.content}
                          placeholder="Important note or quote..."
                          onChange={(e) => updateBlockContent(idx, e.target.value)}
                          className="w-full text-body-md font-body-md italic text-on-surface bg-transparent outline-none resize-none"
                          rows={2}
                        />
                      </div>
                    )}

                    {/* CHECKLIST */}
                    {block.type === "CHECKLIST" && (
                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-secondary"
                        />
                        <input
                          type="text"
                          value={block.content}
                          placeholder="Checklist item..."
                          onChange={(e) => updateBlockContent(idx, e.target.value)}
                          className="flex-1 text-body-md font-body-md text-on-surface bg-transparent outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Block Addition Toolbar Strip */}
              <div className="flex items-center gap-1.5 pt-6 border-t border-surface-container flex-wrap">
                <span className="font-label-sm text-label-sm text-outline mr-2">Add block:</span>
                <button
                  type="button"
                  onClick={() => addBlock("PARAGRAPH")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">notes</span> Text
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("HEADING")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">title</span> Heading
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("CODE")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">code</span> Code
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("QUOTE")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">format_quote</span> Quote
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("CHECKLIST")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">check_box</span> Checklist
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ══ Right Version Drawer ══ */}
        {isHistoryOpen && (
          <aside className="w-80 flex-shrink-0 bg-surface-container-lowest border-l border-surface-container shadow-md flex flex-col p-space-md gap-space-md z-20 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Version History</span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <button
              onClick={() => createSnapshotMutation.mutate()}
              disabled={createSnapshotMutation.isPending}
              className="w-full py-1.5 px-3 bg-secondary-fixed text-on-secondary-fixed rounded-lg text-body-sm font-semibold hover:bg-secondary-fixed-dim transition-colors flex items-center justify-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">bookmark_add</span>
              <span>{createSnapshotMutation.isPending ? "Creating..." : "Save Snapshot"}</span>
            </button>

            <div className="flex flex-col gap-2 pt-2">
              {versions.length === 0 ? (
                <p className="font-body-sm text-body-sm text-outline text-center py-4">No snapshots saved yet.</p>
              ) : (
                versions.map((ver, idx) => (
                  <div key={ver.id || idx} className="p-3 rounded-lg bg-surface-container-low border border-surface-container space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md font-semibold text-primary">
                        v{versions.length - idx} {idx === 0 ? "(Current)" : ""}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        {new Date(ver.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Saved by {ver.user?.username || "Teammate"}
                    </p>

                    {idx !== 0 && (
                      <button
                        onClick={() => restoreVersionMutation.mutate(ver.id)}
                        disabled={restoreVersionMutation.isPending}
                        className="text-primary hover:underline font-label-md text-label-md font-medium"
                      >
                        Restore this version
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ══ Create Document Modal ══ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">note_add</span>
                <h3 className="text-sm font-semibold text-zinc-900">New Document</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Visibility</label>
                <select
                  className="ac-select"
                  value={newDocVisibility}
                  onChange={(e) => setNewDocVisibility(e.target.value)}
                >
                  <option value="WORKSPACE">Workspace Visible</option>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
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
