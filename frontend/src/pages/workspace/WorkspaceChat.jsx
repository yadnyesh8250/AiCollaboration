import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";
import { useAuthStore } from "../../stores/authStore";

/* ══════════════════════════════════════════════════════
   A-Collab Workspace Chat & Thread Panel
   Stitch Workspace OS Design System
   ══════════════════════════════════════════════════════ */
export default function WorkspaceChat() {
  const { workspaceId, "*": channelSlug } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [detectedTask, setDetectedTask] = useState(null);
  const [isExtractingTask, setIsExtractingTask] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Thread sidebar state
  const [activeThreadMessage, setActiveThreadMessage] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadInputValue, setThreadInputValue] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);

  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInputValue, setEditInputValue] = useState("");

  // Fetch channels in workspace to match slug
  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  const activeChannel = channels.find((c) => c.slug === channelSlug) || channels[0];
  const channelId = activeChannel?.id;

  // Fetch channel messages list
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => api.get(`/channels/${channelId}/messages`).then((res) => res.data.messages),
    enabled: !!channelId,
  });

  // Fetch thread replies on active thread message change
  useEffect(() => {
    if (!activeThreadMessage) return;

    const fetchThread = async () => {
      try {
        setLoadingThread(true);
        const res = await api.get(`/messages/${activeThreadMessage.id}/thread`);
        if (res.data.success) {
          setThreadReplies(res.data.replies || []);
        }
      } catch (err) {
        console.error("Error fetching thread replies:", err);
      } finally {
        setLoadingThread(false);
      }
    };

    fetchThread();
  }, [activeThreadMessage]);

  // Real-time message & socket listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channelId) return;

    socket.emit("joinChannel", channelId);

    const handleReceiveMessage = (newMessage) => {
      if (newMessage.parentMessageId) {
        if (activeThreadMessage && activeThreadMessage.id === newMessage.parentMessageId) {
          setThreadReplies((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        queryClient.setQueryData(["messages", channelId], (old = []) => {
          return old.map((m) =>
            m.id === newMessage.parentMessageId
              ? { ...m, _count: { replies: (m._count?.replies || 0) + 1 } }
              : m
          );
        });
        return;
      }

      queryClient.setQueryData(["messages", channelId], (old = []) => {
        if (old.some((m) => m.id === newMessage.id)) return old;
        return [...old, newMessage];
      });
    };

    const handleTyping = (data) => {
      if (data.userId === "ai" && data.channelId === channelId) {
        setAiTyping(true);
      }
    };

    const handleStopTyping = (data) => {
      if (data.userId === "ai" && data.channelId === channelId) {
        setAiTyping(false);
      }
    };

    const handleAiMessageChunk = (data) => {
      if (data.channelId !== channelId) return;
      queryClient.setQueryData(["messages", channelId], (old = []) => {
        const exists = old.find((m) => m.id === data.messageId);
        if (exists) {
          return old.map((m) =>
            m.id === data.messageId ? { ...m, content: m.content + data.chunk } : m
          );
        } else {
          return [
            ...old,
            {
              id: data.messageId,
              channelId: data.channelId,
              senderId: "ai",
              sender: { username: "CollabAI" },
              content: data.chunk,
              messageType: "AI",
              createdAt: new Date().toISOString()
            }
          ];
        }
      });
    };

    const handleAiMessageComplete = (data) => {
      if (data.channelId !== channelId) return;
      setAiTyping(false);
      queryClient.setQueryData(["messages", channelId], (old = []) => {
        const exists = old.find((m) => m.id === data.messageId);
        if (exists) {
          return old.map((m) =>
            m.id === data.messageId ? { ...m, content: data.fullContent } : m
          );
        } else {
          return [
            ...old,
            {
              id: data.messageId,
              channelId: data.channelId,
              senderId: "ai",
              sender: { username: "CollabAI" },
              content: data.fullContent,
              messageType: "AI",
              createdAt: new Date().toISOString()
            }
          ];
        }
      });
    };

    const handleReactionAdded = (reaction) => {
      queryClient.setQueryData(["messages", channelId], (old = []) => {
        return old.map((m) => {
          if (m.id !== reaction.messageId) return m;
          const reactions = m.reactions || [];
          if (reactions.some((r) => r.id === reaction.id)) return m;
          return { ...m, reactions: [...reactions, reaction] };
        });
      });
    };

    const handleReactionRemoved = (data) => {
      queryClient.setQueryData(["messages", channelId], (old = []) => {
        return old.map((m) => {
          if (m.id !== data.messageId) return m;
          const reactions = m.reactions || [];
          return {
            ...m,
            reactions: reactions.filter(
              (r) => !(r.userId === data.userId && r.emoji === data.emoji)
            )
          };
        });
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("aiMessageChunk", handleAiMessageChunk);
    socket.on("aiMessageComplete", handleAiMessageComplete);
    socket.on("reactionAdded", handleReactionAdded);
    socket.on("reactionRemoved", handleReactionRemoved);

    return () => {
      socket.emit("leaveChannel", channelId);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("aiMessageChunk", handleAiMessageChunk);
      socket.off("aiMessageComplete", handleAiMessageComplete);
      socket.off("reactionAdded", handleReactionAdded);
      socket.off("reactionRemoved", handleReactionRemoved);
    };
  }, [channelId, queryClient, activeThreadMessage]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ content, parentMessageId }) =>
      api.post(`/channels/${channelId}/messages`, { content, parentMessageId }),
    onSuccess: () => {
      refetchMessages();
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: ({ id, content }) => api.patch(`/messages/${id}`, { content }),
    onSuccess: () => {
      setEditingMessageId(null);
      refetchMessages();
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (id) => api.delete(`/messages/${id}`),
    onSuccess: () => {
      refetchMessages();
    }
  });

  // Reactions mutation
  const toggleReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji, hasReacted }) => {
      if (hasReacted) {
        return api.delete(`/messages/${messageId}/reactions`, { data: { emoji } });
      } else {
        return api.post(`/messages/${messageId}/reactions`, { emoji });
      }
    },
    onSuccess: () => {
      refetchMessages();
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time task extraction detection in input
  useEffect(() => {
    const val = inputValue.trim();
    if (val.length < 8) {
      setDetectedTask(null);
      return;
    }

    const taskTriggers = ["@ ", "please fix", "implement", "update", "due by", "by friday", "task:", "todo:"];
    const isTaskLike = taskTriggers.some((trig) => val.toLowerCase().includes(trig));

    if (isTaskLike && !detectedTask) {
      const timer = setTimeout(async () => {
        try {
          setIsExtractingTask(true);
          const res = await api.post(`/workspaces/${workspaceId}/ai/extract-task`, { text: val });
          if (res.data.success && res.data.data) {
            setDetectedTask(res.data.data);
          }
        } catch (err) {
          // ignore
        } finally {
          setIsExtractingTask(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [inputValue, workspaceId]);

  const createDetectedTaskMutation = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/tasks`, {
        title: detectedTask.title,
        priority: detectedTask.priority || "MEDIUM",
        assignedTo: detectedTask.assignee?.id || null,
        status: "TODO",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceTasks", workspaceId] });
      sendMessageMutation.mutate({
        content: `⚡ **Task Created**: "${detectedTask.title}"${detectedTask.assignee ? ` assigned to @${detectedTask.assignee.username}` : ""}`,
      });
      setDetectedTask(null);
    },
  });

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || !channelId) return;
    sendMessageMutation.mutate({ content: inputValue.trim() });
    setInputValue("");
  };

  const handleSendThreadReply = (e) => {
    e?.preventDefault();
    if (!threadInputValue.trim() || !activeThreadMessage) return;

    sendMessageMutation.mutate({
      content: threadInputValue.trim(),
      parentMessageId: activeThreadMessage.id
    });
    setThreadReplies((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: threadInputValue.trim(),
        sender: { id: user?.id, username: user?.username },
        createdAt: new Date().toISOString()
      }
    ]);
    setThreadInputValue("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channelId) return;

    try {
      const msgRes = await api.post(`/channels/${channelId}/messages`, {
        content: `Uploaded attachment: ${file.name}`
      });

      if (msgRes.data.success) {
        const messageId = msgRes.data.message.id;
        const formData = new FormData();
        formData.append("file", file);

        await api.post(`/messages/${messageId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        refetchMessages();
      }
    } catch (err) {
      console.error("Error uploading message file attachment:", err);
      alert("Attachment upload failed.");
    }
  };

  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isCodeSnippet = (text) => {
    return text.includes("```") || text.includes("curl ") || text.includes("SELECT ") || text.includes("docker ");
  };

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden select-none">
      
      {/* ══ Top Secondary Utility / Channel Bar ══ */}
      <header className="flex-none bg-surface-container-lowest px-space-md py-2.5 flex items-center justify-between shadow-xs border-b border-surface-container z-20">
        <div className="flex items-center gap-space-md min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              {activeChannel?.type === "PRIVATE" ? "lock" : "tag"}
            </span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate tracking-tight">
              {activeChannel?.name || "development"}
            </h1>
            <button
              onClick={() => setIsStarred(!isStarred)}
              className={`p-1 rounded-lg transition-colors ${
                isStarred ? "text-amber-500 bg-amber-50" : "text-outline hover:text-on-surface hover:bg-surface-container-low"
              }`}
              title="Star channel"
            >
              <span className="material-symbols-outlined text-base">star</span>
            </button>
          </div>

          <div className="h-4 w-px bg-surface-container-high hidden sm:block" />

          <div className="hidden lg:flex items-center gap-space-sm text-on-surface-variant min-w-0">
            <span className="font-body-sm text-body-sm truncate max-w-md text-on-surface-variant">
              {activeChannel?.description || "Engineering discussions, architecture RFCs, CI/CD and deployment alerts"}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-3 text-outline">
            <span className="font-label-sm text-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">group</span>
              {activeChannel?._count?.members || "Active"}
            </span>
          </div>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-space-xs flex-none">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm border border-outline-variant/30">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-on-surface font-medium">GitHub: Active</span>
          </div>

          <button
            onClick={() => {
              if (inputValue.includes("@ai")) {
                setInputValue(prev => prev.replace("@ai ", ""));
              } else {
                setInputValue(prev => `@ai ${prev}`);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim transition-colors font-body-sm text-body-sm font-medium shadow-xs"
          >
            <span className="material-symbols-outlined text-base text-secondary">auto_awesome</span>
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </header>

      {/* ══ Workspace Central Body (Channel Feed + Thread Drawer) ══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        
        {/* ── Primary Chat Feed Area ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface">
          
          {/* Timeline Scroll Container */}
          <div className="flex-1 overflow-y-auto px-space-md lg:px-space-xl py-space-lg space-y-space-md">
            
            {/* Channel Topic Banner / Notice Card */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/20 flex items-start gap-space-md">
              <div className="p-2 rounded-lg bg-primary-container text-on-primary shadow-xs">
                <span className="material-symbols-outlined text-xl">terminal</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Welcome to #{activeChannel?.name || "development"}
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-outline uppercase font-medium">
                    Core Workspace
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {activeChannel?.description || "This channel is connected to GitHub repository acollab-core/api-services. Commits, PR notifications, and deploy health reports pipe here automatically."}
                </p>
              </div>
            </div>

            {/* Date Separator */}
            <div className="relative flex items-center justify-center my-space-md">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full bg-surface-container-high h-px" />
              </div>
              <span className="relative bg-surface-container-lowest px-3 py-0.5 rounded-full font-label-sm text-label-sm font-medium text-outline shadow-xs border border-surface-container">
                Today, {new Date().toLocaleDateString([], { month: "long", day: "numeric" })}
              </span>
            </div>

            {/* Messages Stream */}
            {loadingMessages ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl animate-spin">progress_activity</span>
                <span className="font-label-sm text-label-sm text-outline">Loading channel feed...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-outline text-4xl mb-2">forum</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">No messages yet</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Send the first message to kick off conversation in #{activeChannel?.name || "development"}!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = user?.id === msg.senderId;
                const isAI = msg.messageType === "AI" || msg.senderId === "ai";
                const isEditing = editingMessageId === msg.id;

                const reactionGroups = (msg.reactions || []).reduce((acc, curr) => {
                  acc[curr.emoji] = acc[curr.emoji] || [];
                  acc[curr.emoji].push(curr);
                  return acc;
                }, {});

                return (
                  <article
                    key={msg.id}
                    className="group relative flex items-start gap-space-md p-space-sm rounded-xl hover:bg-surface-container-lowest transition-colors"
                  >
                    {/* Hover Actions Menu */}
                    <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-surface-container-lowest shadow-md rounded-lg p-0.5 z-10 border border-surface-container">
                      {["👍", "🚀", "❤️", "👀"].map((emoji) => {
                        const hasReacted = (msg.reactions || []).some(
                          (r) => r.userId === user?.id && r.emoji === emoji
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReactionMutation.mutate({ messageId: msg.id, emoji, hasReacted })}
                            className={`p-1 hover:bg-surface-container-high rounded text-xs transition-colors ${
                              hasReacted ? "bg-secondary-container/40" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}

                      <div className="h-3 w-px bg-surface-container-high mx-1" />

                      <button
                        onClick={() => setActiveThreadMessage(msg)}
                        className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                        title="Reply in thread"
                      >
                        <span className="material-symbols-outlined text-base">forum</span>
                      </button>

                      {isOwn && (
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditInputValue(msg.content);
                          }}
                          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      )}

                      {isOwn && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this message?")) {
                              deleteMessageMutation.mutate(msg.id);
                            }
                          }}
                          className="p-1 hover:bg-error-container/40 rounded text-error-stitch"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Sender Avatar */}
                    {isAI ? (
                      <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-none shadow-xs">
                        <span className="material-symbols-outlined text-base text-secondary">auto_awesome</span>
                      </div>
                    ) : msg.sender?.avatarUrl ? (
                      <img
                        className="w-9 h-9 rounded-full object-cover flex-none ring-1 ring-surface-container-high"
                        src={msg.sender.avatarUrl}
                        alt={msg.sender.username}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center flex-none">
                        {(msg.sender?.firstName || msg.sender?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                          {isAI ? "CollabAI" : (msg.sender?.firstName ? `${msg.sender.firstName} ${msg.sender.lastName || ""}` : msg.sender?.username || "User")}
                        </span>
                        {isOwn && <span className="font-label-sm text-label-sm text-outline">(You)</span>}
                        {isAI && (
                          <span className="font-label-sm text-label-sm px-1.5 py-0.2 rounded bg-secondary-container/40 text-on-secondary-container font-semibold">
                            AI
                          </span>
                        )}
                        <span className="font-label-sm text-label-sm text-outline ml-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Content or Edit input */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editInputValue}
                            onChange={(e) => setEditInputValue(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-primary bg-surface text-on-surface text-body-sm outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => editMessageMutation.mutate({ id: msg.id, content: editInputValue })}
                              className="px-2.5 py-1 bg-primary text-on-primary rounded text-label-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 bg-surface-container rounded text-on-surface text-label-sm font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-body-md text-body-md text-on-surface leading-relaxed break-words whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {msg.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={file.fileUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container transition-colors max-w-xs"
                            >
                              <span className="material-symbols-outlined text-sm text-primary">attach_file</span>
                              <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{file.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Reactions Chips */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {Object.entries(reactionGroups).map(([emoji, reacts]) => {
                            const hasReacted = reacts.some((r) => r.userId === user?.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReactionMutation.mutate({ messageId: msg.id, emoji, hasReacted })}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                  hasReacted
                                    ? "bg-secondary-container text-on-secondary-container ring-1 ring-secondary"
                                    : "bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-label-sm text-label-sm font-semibold">{reacts.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Thread Replies Button */}
                      {(msg._count?.replies > 0 || (activeThreadMessage && activeThreadMessage.id === msg.id)) && (
                        <div className="pt-1">
                          <button
                            onClick={() => setActiveThreadMessage(msg)}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-primary font-body-sm text-body-sm font-medium transition-colors"
                          >
                            <span className="material-symbols-outlined text-base text-secondary">forum</span>
                            <span>{msg._count?.replies || threadReplies.length} replies</span>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            {/* AI Typing Indicator */}
            {aiTyping && (
              <div className="px-space-md py-1 flex items-center gap-2 text-outline font-label-sm text-label-sm min-h-6">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse [animation-delay:400ms]" />
                </span>
                <span><strong className="text-on-surface font-medium">CollabAI</strong> is formulating reply...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Smart Task Extraction Banner */}
          {detectedTask && (
            <div className="mx-space-md mb-2 bg-gradient-to-r from-secondary-container/30 to-surface-container-lowest border border-secondary/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                <div className="min-w-0">
                  <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                    Task detected: <span className="font-semibold text-primary">"{detectedTask.title}"</span>
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {detectedTask.assignee ? `Assigned → @${detectedTask.assignee.username}` : "Unassigned"}
                    {detectedTask.dueDateStr && ` · Due ${detectedTask.dueDateStr}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => createDetectedTaskMutation.mutate()}
                  disabled={createDetectedTaskMutation.isPending}
                  className="h-7 px-3 bg-primary hover:bg-primary-container text-on-primary text-label-md font-label-md rounded font-medium transition-colors"
                >
                  {createDetectedTaskMutation.isPending ? "Creating..." : "Create Task ✨"}
                </button>
                <button
                  type="button"
                  onClick={() => setDetectedTask(null)}
                  className="p-1 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Rich Message Composer Container */}
          <div className="p-space-md bg-surface-container-lowest shadow-[0_-2px_12px_rgba(0,0,0,0.03)] border-t border-surface-container z-10">
            <div className="rounded-xl bg-surface-container-low p-2 focus-within:bg-surface-container-lowest focus-within:shadow-xs transition-all border border-outline-variant/30">
              <textarea
                className="w-full bg-transparent resize-none border-0 text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none px-2"
                placeholder={`Message #${activeChannel?.name || "development"}...`}
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Rich Formatting & Action Bar */}
              <div className="flex items-center justify-between pt-2 px-1 border-t border-surface-container/60">
                <div className="flex items-center gap-0.5 text-on-surface-variant overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setInputValue(prev => prev + "**bold**")}
                    className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    title="Bold"
                  >
                    <span className="material-symbols-outlined text-base">format_bold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputValue(prev => prev + "_italic_")}
                    className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    title="Italic"
                  >
                    <span className="material-symbols-outlined text-base">format_italic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputValue(prev => prev + "\n```\ncode\n```\n")}
                    className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    title="Code"
                  >
                    <span className="material-symbols-outlined text-base">code</span>
                  </button>
                  <div className="h-4 w-px bg-surface-container-high mx-1" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    title="Attach file"
                  >
                    <span className="material-symbols-outlined text-base">attach_file</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (inputValue.includes("@ai")) {
                        setInputValue(prev => prev.replace("@ai ", ""));
                      } else {
                        setInputValue(prev => `@ai ${prev}`);
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg bg-surface-container-high text-primary hover:bg-secondary-container transition-colors flex items-center gap-1 font-label-sm text-label-sm font-semibold ml-1"
                    title="CollabAI Prompt"
                  >
                    <span className="material-symbols-outlined text-sm text-secondary">auto_awesome</span> CollabAI
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-40 transition-colors shadow-xs"
                  title="Send message"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right-Side Contextual Thread Drawer ── */}
        {activeThreadMessage && (
          <aside className="w-80 md:w-96 flex flex-col flex-none bg-surface-container-lowest shadow-[0_0_24px_rgba(0,0,0,0.06)] border-l border-surface-container z-20">
            {/* Thread Header */}
            <div className="h-12 px-space-md flex items-center justify-between bg-surface-container-low flex-none border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Thread</span>
                <span className="font-label-sm text-label-sm text-outline">#{activeChannel?.name || "development"}</span>
              </div>
              <button
                onClick={() => setActiveThreadMessage(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Thread Message Log */}
            <div className="flex-1 overflow-y-auto p-space-md space-y-space-md bg-surface">
              {/* Root Message Anchor */}
              <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                    {(activeThreadMessage.sender?.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                    {activeThreadMessage.sender?.username || "User"}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {formatTime(activeThreadMessage.createdAt)}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  {activeThreadMessage.content}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold tracking-wider">
                  Replies ({threadReplies.length})
                </span>
              </div>

              {/* Thread Replies */}
              {loadingThread ? (
                <div className="py-6 text-center text-outline font-label-sm text-label-sm">Loading replies...</div>
              ) : threadReplies.length === 0 ? (
                <div className="py-6 text-center text-on-surface-variant font-body-sm text-body-sm">
                  No replies yet. Be the first to reply!
                </div>
              ) : (
                threadReplies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-space-sm">
                    <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center flex-none">
                      {(reply.sender?.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                          {reply.sender?.username || "User"}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline">
                          {formatTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Thread Reply Composer */}
            <form onSubmit={handleSendThreadReply} className="p-space-sm border-t border-surface-container bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reply in thread..."
                  value={threadInputValue}
                  onChange={(e) => setThreadInputValue(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!threadInputValue.trim()}
                  className="px-3 h-9 bg-primary text-on-primary rounded-lg text-label-md font-label-md font-semibold hover:bg-primary-container disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
