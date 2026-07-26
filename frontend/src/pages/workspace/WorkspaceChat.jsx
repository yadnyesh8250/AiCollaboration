import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api/client";
import { getSocket } from "../../services/socket/connection";

export default function WorkspaceChat() {
  const { workspaceId, "*": channelSlug } = useParams();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

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

  // Real-time message receiver
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channelId) return;

    socket.emit("joinChannel", channelId);

    const handleReceiveMessage = (newMessage) => {
      queryClient.setQueryData(["messages", channelId], (old = []) => {
        // Prevent duplicate append
        if (old.some((m) => m.id === newMessage.id)) return old;
        return [...old, newMessage];
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.emit("leaveChannel", channelId);
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [channelId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content) => api.post(`/channels/${channelId}/messages`, { content }),
    onSuccess: (res) => {
      refetchMessages();
    },
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

    const text = inputValue.trim();
    sendMessageMutation.mutate(text);
    setInputValue("");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (username) => {
    if (!username) return "bg-zinc-900 text-zinc-500 border-zinc-950";
    const colors = [
      "bg-teal-950/20 text-teal-400 border-teal-900/35",
      "bg-purple-950/20 text-purple-400 border-purple-900/35",
      "bg-blue-950/20 text-blue-400 border-blue-900/35",
      "bg-amber-950/20 text-amber-400 border-amber-900/35"
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const [expandedCards, setExpandedCards] = useState({});
  
  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleActionClick = (actionName) => {
    console.log(`Action clicked: ${actionName}`);
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
    <div className="flex flex-col h-full bg-[#030303] text-foreground overflow-hidden selection:bg-primary/20 selection:text-white">
      {/* Channel Title Header */}
      <div className="h-12 border-b border-zinc-950 px-6 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md">
        <div>
          <h2 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5 select-none">
            <span className="text-zinc-650 font-medium">#</span>
            {activeChannel?.name || "chat"}
          </h2>
          <p className="text-[9px] text-zinc-550 font-medium mt-0.5 select-none">{activeChannel?.description || "Channel conversation feed"}</p>
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 no-scrollbar">
        {loadingChannels || (channelId && loadingMessages) ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider animate-pulse">Loading feed...</span>
          </div>
        ) : !channelId ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200 select-none">
            <div className="h-10 w-10 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400">No Channels Configured</h4>
              <p className="text-[10px] text-zinc-550 mt-1 max-w-[240px]">
                Create a channel in this workspace to launch communication.
              </p>
            </div>
          </div>
        ) : !Array.isArray(messages) || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 animate-in fade-in duration-200 select-none">
            <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-300">Welcome to #{activeChannel?.name || "channel"}!</h4>
              <p className="text-[10px] text-zinc-550 mt-1 max-w-[260px]">
                This is the beginning of the #{activeChannel?.name || "channel"} channel stream. Send a message to start.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const payload = msg.payload ? (typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload) : {};
            const isExpanded = !!expandedCards[msg.id];
            const isAI = msg.messageType === "AI";

            return (
              <div key={msg.id} className="animate-in fade-in duration-200">
                {isAI ? (
                  /* Premium Timeline Card Block (AI Collaboration Layer) */
                  <div className="flex items-start gap-3 pl-10 select-none">
                    <div className="flex-1 bg-zinc-950/20 border border-zinc-950 border-l-2 border-l-purple-500/80 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-sm">
                      {/* Purple aura */}
                      <div className="absolute inset-0 bg-radial-[circle_at_top_left,rgba(139,92,246,0.015),transparent_60%] pointer-events-none" />

                      {/* Top Bar inside AI Card */}
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs shrink-0">{getCardIcon(payload.cardType)}</span>
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{payload.title || "AI Response"}</span>
                        </div>
                        {payload.status && (
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${payload.statusColor || "bg-purple-950/10 text-purple-400 border-purple-900/20"}`}>
                            {payload.status}
                          </span>
                        )}
                      </div>

                      {/* Context Chips */}
                      {payload.chips && payload.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 relative z-10">
                          {payload.chips.map((chip, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 text-[8px] font-bold bg-zinc-950/80 text-zinc-500 border border-zinc-900 px-2 py-0.5 rounded-full"
                            >
                              <span>{chip.icon}</span>
                              <span className="uppercase tracking-wider">{chip.label}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Primary text */}
                      <div className="text-[11px] text-zinc-350 leading-relaxed font-semibold relative z-10">
                        {msg.content}
                      </div>

                      {/* Collapsible details toggle */}
                      {payload.details && payload.details.length > 0 && (
                        <div className="border border-zinc-950 rounded-lg overflow-hidden bg-zinc-950/20 relative z-10">
                          <button
                            onClick={() => toggleCardExpansion(msg.id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[8px] font-bold text-zinc-650 uppercase tracking-widest hover:text-zinc-300 transition-all cursor-pointer"
                          >
                            <span>Details ({payload.details.length} logs)</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                              stroke="currentColor"
                              className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-2.5 pt-1 border-t border-zinc-950 space-y-1">
                              {payload.details.map((detail, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold">
                                  <span className="text-emerald-500">✓</span>
                                  <span>{detail}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Suggested actions */}
                      {payload.actions && payload.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 relative z-10">
                          {payload.actions.map((act) => (
                            <button
                              key={act}
                              onClick={() => handleActionClick(act)}
                              className="text-[9px] font-bold text-purple-400 bg-purple-950/10 hover:bg-purple-950/20 border border-purple-900/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* User Message Block */
                  <div className="flex items-start gap-3">
                    <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 select-none ${getAvatarColor(msg.sender?.username)}`}>
                      {getInitials(msg.sender?.username || "System")}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-baseline gap-2 select-none">
                        <span className="text-xs font-bold text-zinc-300">{msg.sender?.username || "System"}</span>
                        <span className="text-[8px] text-zinc-650 font-bold uppercase">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed truncate-none">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <form onSubmit={handleSend} className="p-6 border-t border-zinc-950 bg-black/25 shrink-0">
        <div className="relative rounded-lg border border-zinc-900 bg-zinc-950/40 focus-within:border-zinc-800 transition-all">
          <input
            type="text"
            placeholder={`Message #${activeChannel?.name || "chat"}... (Use @ai review to invoke AI assistant)`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-11 bg-transparent pl-4 pr-24 text-xs text-foreground outline-none border-none placeholder:text-zinc-650"
          />

          {/* Action icons absolute in composer bar */}
          <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
            <button
              type="button"
              className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded transition-colors cursor-pointer"
              title="Add attachment"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <button
              type="submit"
              className="p-1.5 text-zinc-500 hover:text-white rounded transition-colors cursor-pointer"
              title="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
