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
      // Sort blocks by position
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
    // Generate a high position value
    const lastBlock = localBlocks[localBlocks.length - 1];
    const newPosition = lastBlock ? lastBlock.position + 1000 : 1000;
    
    const newBlock = {
      id: `temp-${Date.now()}`, // Temporary ID for client list keys
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
    
    // Swap positions
    const tempPos = nextBlocks[index].position;
    nextBlocks[index].position = nextBlocks[targetIndex].position;
    nextBlocks[targetIndex].position = tempPos;

    // Swap elements in list
    const tempObj = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIndex];
    nextBlocks[targetIndex] = tempObj;

    setLocalBlocks(nextBlocks);
  };

  const handleSaveBlocks = () => {
    // Prepare blocks for payload (remove temp- prefix id)
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
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onBlur={handleSaveDocMeta}
                className="text-sm font-bold tracking-tight text-foreground bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-primary outline-none px-1"
              />
              <div className="flex items-center gap-2 mt-0.5 pl-1">
                <select
                  value={docVisibility}
                  onChange={(e) => {
                    setDocVisibility(e.target.value);
                    updateDocMutation.mutate({ visibility: e.target.value });
                  }}
                  className="text-[9px] font-bold text-zinc-500 uppercase bg-transparent outline-none border border-transparent hover:border-zinc-800 rounded cursor-pointer"
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
              onClick={() => {
                if (confirm("Are you sure you want to delete this document?")) {
                  deleteDocMutation.mutate();
                }
              }}
              className="text-[10px] font-bold text-red-400 bg-red-950/15 border border-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={handleSaveBlocks}
              disabled={updateBlocksMutation.isPending}
              className="text-[10px] font-bold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg hover:scale-[1.01] transition-transform cursor-pointer"
            >
              {updateBlocksMutation.isPending ? "Saving..." : "Save Blocks"}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative no-scrollbar">
          {localBlocks.map((block, idx) => {
            // Render block by type
            return (
              <div key={block.id} className="group relative border border-zinc-900/30 bg-zinc-900/10 rounded-xl p-3.5 space-y-2 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all">
                {/* Block Controls (top right corner of block card) */}
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-900 p-1 rounded-lg z-10">
                  <button
                    onClick={() => moveBlock(idx, "up")}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 cursor-pointer"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveBlock(idx, "down")}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-900 cursor-pointer"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => deleteBlock(idx)}
                    className="p-1 text-red-500/80 hover:text-red-400 rounded hover:bg-zinc-900 cursor-pointer"
                    title="Delete block"
                  >
                    ✕
                  </button>
                </div>

                {/* Block Details */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-500">
                    {block.type}
                  </span>
                </div>

                {/* Block Content Editor */}
                {block.type === "HEADING" && (
                  <input
                    type="text"
                    value={block.content}
                    placeholder="Enter heading..."
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    className="w-full text-base font-bold text-zinc-150 bg-transparent outline-none border-b border-transparent focus:border-primary/25"
                  />
                )}

                {block.type === "PARAGRAPH" && (
                  <textarea
                    value={block.content}
                    placeholder="Write something..."
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    className="w-full text-xs text-zinc-350 bg-transparent outline-none resize-none no-scrollbar min-h-[40px] focus:border-b focus:border-primary/25"
                  />
                )}

                {block.type === "CODE" && (
                  <textarea
                    value={block.content}
                    placeholder="// Write code here..."
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    className="w-full font-mono text-[10px] text-teal-400 bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 outline-none min-h-[70px] resize-y"
                  />
                )}

                {block.type === "QUOTE" && (
                  <div className="flex gap-2">
                    <span className="text-xl text-primary font-serif font-black select-none">“</span>
                    <textarea
                      value={block.content}
                      placeholder="Write quote..."
                      onChange={(e) => updateBlockContent(idx, e.target.value)}
                      className="flex-1 text-xs text-zinc-400 italic bg-transparent outline-none resize-none"
                    />
                  </div>
                )}

                {block.type === "CHECKLIST" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={(() => {
                        try {
                          const parsed = JSON.parse(block.content);
                          return !!parsed.completed;
                        } catch {
                          return false;
                        }
                      })()}
                      onChange={(e) => {
                        let text = "Checklist item";
                        try {
                          text = JSON.parse(block.content).text;
                        } catch {}
                        updateBlockContent(idx, JSON.stringify({ text, completed: e.target.checked }));
                      }}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-primary focus:ring-primary/45 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={(() => {
                        try {
                          return JSON.parse(block.content).text || "";
                        } catch {
                          return block.content;
                        }
                      })()}
                      onChange={(e) => {
                        let completed = false;
                        try {
                          completed = JSON.parse(block.content).completed;
                        } catch {}
                        updateBlockContent(idx, JSON.stringify({ text: e.target.value, completed }));
                      }}
                      className="flex-1 text-xs text-zinc-350 bg-transparent outline-none border-b border-transparent focus:border-primary/25"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Block Toolbar (at bottom of blocks list) */}
          <div className="pt-4 border-t border-zinc-900/60 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Add Block</span>
            <div className="flex flex-wrap gap-2">
              {["HEADING", "PARAGRAPH", "CHECKLIST", "CODE", "QUOTE"].map((t) => (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className="h-7 px-3 rounded-lg border border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/30 text-[9px] font-bold text-zinc-400 hover:text-foreground transition-all cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Workspace Documents</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Collaborative project briefs and specification documents</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-9 px-4 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          Create Document
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20">
            <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">No Documents Found</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-[280px]">
                Create a document to start writing specifications and briefs.
              </p>
            </div>
          </div>
        ) : (
          documents.map((doc) => (
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
                  <p className="text-[10px] text-zinc-500 font-medium">Visibility: {doc.visibility}</p>
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">
                {new Date(doc.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Create Document Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h3 className="text-base font-bold text-foreground">Create Document</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-foreground cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint Brief"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-3 text-xs text-foreground placeholder:text-zinc-500/60 outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Visibility</label>
                <select
                  value={newDocVisibility}
                  onChange={(e) => setNewDocVisibility(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-950 px-2 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="WORKSPACE">Workspace (visible to everyone in workspace)</option>
                  <option value="PUBLIC">Public (everyone with the link can view)</option>
                  <option value="PRIVATE">Private (invite-only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-zinc-800 hover:bg-zinc-900/40 text-xs font-semibold text-zinc-400 hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocMutation.isPending}
                  className="h-9 px-4 rounded-lg bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
