import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";
import { useAuthStore } from "../../stores/authStore";

export default function WorkspaceChat() {
  const { workspaceId, "*": channelSlug } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
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
      // If it's a thread reply, update thread state if active
      if (newMessage.parentMessageId) {
        if (activeThreadMessage && activeThreadMessage.id === newMessage.parentMessageId) {
          setThreadReplies((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        // Increment reply count in main timeline
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

    // Socket reaction listeners
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !channelId) return;

    sendMessageMutation.mutate({ content: inputValue.trim() });
    setInputValue("");
  };

  const handleSendThreadReply = (e) => {
    e.preventDefault();
    if (!threadInputValue.trim() || !activeThreadMessage) return;

    sendMessageMutation.mutate({
      content: threadInputValue.trim(),
      parentMessageId: activeThreadMessage.id
    });
    // Optimistic append thread reply locally
    setThreadReplies((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: threadInputValue.trim(),
        sender: { id: user.id, username: user.username },
        createdAt: new Date().toISOString()
      }
    ]);
    setThreadInputValue("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channelId) return;

    try {
      // 1. Create a text message first representing the file attachment
      const msgRes = await api.post(`/channels/${channelId}/messages`, {
        content: `Uploaded attachment: ${file.name}`
      });

      if (msgRes.data.success) {
        const messageId = msgRes.data.message.id;
        
        // 2. Upload actual file data to attachments endpoint
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

  const getInitials = (name) => {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  };

  // Deterministic background color per user
  const getAvatarBg = (username) => {
    if (!username) return "bg-zinc-200 text-zinc-600";
    const palettes = [
      "bg-teal-500",
      "bg-violet-500",
      "bg-blue-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-emerald-500",
      "bg-indigo-500",
      "bg-pink-500",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  // Reusable avatar component — shows photo if available, else colored initials
  const UserAvatar = ({ user: u, size = "md" }) => {
    const sizeClass = size === "lg" ? "h-9 w-9 text-sm" : size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
    const username = u?.username || "?";
    const avatarUrl = u?.avatarUrl;
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={username}
          className={`${sizeClass} rounded-full object-cover shrink-0 ring-2 ring-white`}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full ${getAvatarBg(username)} text-white font-semibold flex items-center justify-center shrink-0 ring-2 ring-white select-none`}>
        {getInitials(username)}
      </div>
    );
  };

  const getCardIcon = (cardType) => {
    switch (cardType) {
      case "code-review": return "💻";
      case "meeting": return "📅";
      case "sprint": return "🚀";
      default: return "🔍";
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-white">
      
      {/* Main Conversation Stream */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Channel Title Header */}
        <div className="h-12 border-b border-border px-6 flex items-center justify-between shrink-0 bg-card/65 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5 select-none">
              <span className="text-zinc-400 font-medium">#</span>
              {activeChannel?.name || "chat"}
            </h2>
            <p className="text-[9px] text-zinc-500 font-medium mt-0.5 select-none">
              {activeChannel?.description || "Channel conversation feed"}
            </p>
          </div>
        </div>

        {/* Message Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 no-scrollbar">
          {loadingChannels || (channelId && loadingMessages) ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider animate-pulse">Loading feed...</span>
            </div>
          ) : !channelId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200 select-none">
              <div className="h-10 w-10 rounded-2xl bg-card border border-border flex items-center justify-center text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-700">No Channels Configured</h4>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[240px]">
                  Create a channel in this workspace to launch communication.
                </p>
              </div>
            </div>
          ) : !Array.isArray(messages) || messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200 select-none">
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-700">Welcome to #{activeChannel?.name || "channel"}!</h4>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[260px]">
                  This is the beginning of the #{activeChannel?.name || "channel"} channel stream. Send a message to start.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const payload = msg.payload ? (typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload) : {};
              const isAI = msg.messageType === "AI";
              const isEditing = editingMessageId === msg.id;

              // Check if self-message for reactions/edits
              const isOwnMessage = user?.id === msg.senderId;

              // Aggregate reactions counts
              const reactionGroups = (msg.reactions || []).reduce((acc, curr) => {
                acc[curr.emoji] = acc[curr.emoji] || [];
                acc[curr.emoji].push(curr);
                return acc;
              }, {});

              return (
                <div key={msg.id} className="group relative animate-in fade-in duration-150 p-2.5 rounded-xl border border-transparent hover:bg-card/45 hover:border-border hover:shadow-xs">
                  
                  {/* Hover Actions Menu (Slack style) */}
                  <div className="absolute right-3.5 -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm p-1">
                    {/* Quick Reactions */}
                    {["👍", "❤️", "🔥", "👀"].map((emoji) => {
                      const hasReacted = (msg.reactions || []).some(
                        (r) => r.userId === user?.id && r.emoji === emoji
                      );
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReactionMutation.mutate({ messageId: msg.id, emoji, hasReacted })}
                          className={`hover:bg-zinc-100 px-1.5 py-0.5 rounded text-xs cursor-pointer ${
                            hasReacted ? "bg-primary/10 text-primary" : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                    <div className="h-3.5 w-[1px] bg-border mx-1" />
                    
                    {/* Thread Reply */}
                    <button
                      onClick={() => setActiveThreadMessage(msg)}
                      className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded cursor-pointer"
                      title="Reply in Thread"
                    >
                      💬
                    </button>

                    {/* Edit Message (Self Only) */}
                    {isOwnMessage && (
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditInputValue(msg.content);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded cursor-pointer"
                        title="Edit message"
                      >
                        ✏️
                      </button>
                    )}

                    {/* Delete Message (Self Only) */}
                    {isOwnMessage && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this message?")) {
                            deleteMessageMutation.mutate(msg.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                        title="Delete message"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {isAI ? (
                    /* AI Card Template Block */
                    <div className="flex items-start gap-3 pl-10">
                      <div className="flex-1 bg-card border border-border border-l-2 border-l-purple-500 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs shrink-0">{getCardIcon(payload.cardType)}</span>
                            <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">{payload.title || "AI Response"}</span>
                          </div>
                          {payload.status && (
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${payload.statusColor || "bg-purple-100 text-purple-600 border-purple-200"}`}>
                              {payload.status}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-700 leading-relaxed font-semibold">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* User Message Layout — Slack style */
                    <div className="flex items-start gap-3">
                      {/* Profile picture / avatar */}
                      <UserAvatar user={msg.sender} size="md" />

                      <div className="flex-1 overflow-hidden space-y-1 min-w-0">
                        <div className="flex items-baseline gap-2 select-none">
                          <span className="text-sm font-semibold text-zinc-900">{msg.sender?.username || "System"}</span>
                          <span className="text-xs text-zinc-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Message content or inline editor */}
                        {isEditing ? (
                          <div className="space-y-1.5 pt-0.5">
                            <input
                              type="text"
                              value={editInputValue}
                              onChange={(e) => setEditInputValue(e.target.value)}
                              className="w-full h-8.5 rounded-lg border border-zinc-300 bg-card px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => editMessageMutation.mutate({ id: msg.id, content: editInputValue })}
                                className="h-6 px-3 bg-primary text-[10px] text-white font-bold rounded hover:bg-primary/95 cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="h-6 px-3 bg-zinc-100 text-[10px] text-zinc-600 font-bold rounded hover:bg-zinc-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-650 leading-relaxed break-words whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}

                        {/* Attachments rendering */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.attachments.map((file) => (
                              <a
                                key={file.id}
                                href={file.fileUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-zinc-50 hover:bg-zinc-100 transition-colors shrink-0 max-w-[220px]"
                              >
                                <span className="text-xs">📎</span>
                                <span className="text-[10px] font-bold text-zinc-600 truncate">{file.fileName || "Download Attachment"}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Reactions Grid */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.entries(reactionGroups).map(([emoji, reacts]) => {
                              const hasReacted = reacts.some((r) => r.userId === user?.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReactionMutation.mutate({ messageId: msg.id, emoji, hasReacted })}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer ${
                                    hasReacted 
                                      ? "bg-primary/10 border-primary/45 text-primary" 
                                      : "bg-zinc-50 border-border text-zinc-500 hover:bg-zinc-100"
                                  }`}
                                  title={reacts.map((r) => r.user?.username).join(", ")}
                                >
                                  <span>{emoji}</span>
                                  <span>{reacts.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Threads Reply Badge indicator */}
                        {msg._count?.replies > 0 && (
                          <button
                            onClick={() => setActiveThreadMessage(msg)}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-primary hover:underline pt-1 cursor-pointer select-none"
                          >
                            <span>💬 View Thread ({msg._count.replies} replies)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {aiTyping && (
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl">
              {/* AI avatar */}
              <div className="h-8 w-8 rounded-full bg-violet-100 border-2 border-white ring-2 ring-violet-200 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-4 h-4 text-violet-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
                </svg>
              </div>
              <div className="space-y-1 select-none">
                <span className="text-sm font-semibold text-zinc-900 block">CollabAI</span>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer — Slack style */}
        <form onSubmit={handleSend} className="px-6 pb-5 pt-3 border-t border-border bg-white shrink-0">
          <div className="flex items-center gap-3">
            {/* Current user avatar */}
            <UserAvatar user={user} size="md" />

            {/* Input box */}
            <div className="flex-1 relative rounded-xl border border-border bg-zinc-50 hover:border-zinc-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-white transition-all">
              <input
                type="text"
                placeholder={`Message #${activeChannel?.name || "chat"}  ·  Use @ai for CollabAI`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-11 bg-transparent pl-4 pr-20 text-sm text-zinc-900 outline-none border-none placeholder:text-zinc-400"
              />

              {/* Hidden upload file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Action buttons */}
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Attach file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-1.5 text-zinc-400 hover:text-primary rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-40"
                  title="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Right Threads Sidebar Panel — Slack style */}
      {activeThreadMessage && (
        <aside className="w-[360px] border-l border-border bg-white flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-200">
          {/* Thread Header */}
          <div className="h-12 border-b border-border px-5 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Thread</h3>
              <p className="text-xs text-zinc-400">#{activeChannel?.name || "chat"}</p>
            </div>
            <button
              onClick={() => setActiveThreadMessage(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Thread Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar bg-zinc-50/40">
            {/* Parent Message Card */}
            <div className="bg-white border border-border rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <UserAvatar user={activeThreadMessage.sender} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{activeThreadMessage.sender?.username || "System"}</p>
                    <span className="text-xs text-zinc-400">Original</span>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap mt-1">
                    {activeThreadMessage.content}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-zinc-400">{threadReplies.length} {threadReplies.length === 1 ? "reply" : "replies"}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Replies List */}
            <div className="space-y-4">
              {loadingThread ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-zinc-400">Loading replies...</span>
                </div>
              ) : threadReplies.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-zinc-400">No replies yet.</p>
                  <p className="text-xs text-zinc-300 mt-1">Be the first to reply.</p>
                </div>
              ) : (
                threadReplies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-3">
                    <UserAvatar user={reply.sender} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-zinc-900">{reply.sender?.username || "System"}</span>
                        <span className="text-xs text-zinc-400">
                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed break-words whitespace-pre-wrap mt-0.5">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Thread Reply Input Composer */}
          <form onSubmit={handleSendThreadReply} className="px-4 pb-4 pt-3 border-t border-border bg-white shrink-0">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size="sm" />
              <div className="flex-1 relative rounded-xl border border-border bg-zinc-50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-white transition-all">
                <input
                  type="text"
                  placeholder="Reply in thread..."
                  value={threadInputValue}
                  onChange={(e) => setThreadInputValue(e.target.value)}
                  className="flex-1 w-full h-9 bg-transparent pl-3 pr-14 text-sm text-zinc-900 outline-none border-none placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!threadInputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-[#087F66] disabled:opacity-40 cursor-pointer px-1"
                >
                  Send
                </button>
              </div>
            </div>
          </form>
        </aside>
      )}
    </div>
  );
}
