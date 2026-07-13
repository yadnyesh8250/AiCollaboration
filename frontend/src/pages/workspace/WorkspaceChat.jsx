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
  const { data: channels = [] } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((res) => res.data.channels),
    enabled: !!workspaceId,
  });

  const activeChannel = channels.find((c) => c.slug === channelSlug) || channels[0];
  const channelId = activeChannel?.id;

  // Fetch channel messages list
  const { data: messages = [], refetch: refetchMessages } = useQuery({
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
      // Append optimistically or wait for socket. We trigger refetch as fallback.
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
    if (!username) return "bg-zinc-800 text-zinc-400 border-zinc-700/60";
    const colors = [
      "bg-teal-500/20 text-teal-400 border-teal-500/30",
      "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "bg-amber-500/20 text-amber-400 border-amber-500/30"
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
    // TODO: Connect suggested action execution to backend endpoint
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
    <div className="flex flex-col h-full bg-zinc-950/20 text-foreground overflow-hidden">
      {/* Channel Title Header */}
      <div className="h-14 border-b border-zinc-900/60 px-6 flex items-center justify-between shrink-0 bg-zinc-950/40 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">#</span>
            development
          </h2>
          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Core developer updates and AI-collaborations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5 overflow-hidden">
            <div className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 bg-teal-500/20 text-[8px] font-bold text-teal-400 flex items-center justify-center border border-teal-500/30">A</div>
            <div className="inline-block h-5 w-5 rounded-full ring-2 ring-zinc-950 bg-purple-500/20 text-[8px] font-bold text-purple-400 flex items-center justify-center border border-purple-500/30">SJ</div>
          </div>
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {messages.map((msg) => {
          const payload = msg.payload ? (typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload) : {};
          const isExpanded = !!expandedCards[msg.id];
          const isAI = msg.messageType === "AI";

          return (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {isAI ? (
                /* Custom Timeline Card Block (AI Collaboration Layer) */
                <div className="flex items-start gap-3 pl-11">
                  <div className="flex-1 bg-zinc-900/10 border border-zinc-800/80 border-l-2 border-l-primary rounded-xl p-4 space-y-4 relative overflow-hidden shadow-lg">
                    {/* Purple aura */}
                    <div className="absolute inset-0 bg-radial-[circle_at_top_left,var(--color-primary)/0.02,transparent_50%] pointer-events-none" />

                    {/* Top Bar inside AI Card */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm shrink-0">{getCardIcon(payload.cardType)}</span>
                        <span className="text-xs font-bold text-zinc-200">{payload.title || "AI Response"}</span>
                      </div>
                      {payload.status && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${payload.statusColor || "bg-primary/10 text-primary border-primary/20"}`}>
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
                            className="flex items-center gap-1 text-[9px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-full select-none"
                          >
                            <span>{chip.icon}</span>
                            <span>{chip.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Primary text */}
                    <div className="text-xs text-zinc-300 leading-relaxed font-medium relative z-10">
                      {msg.content}
                    </div>

                    {/* Collapsible details toggle */}
                    {payload.details && payload.details.length > 0 && (
                      <div className="border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-950/40 relative z-10">
                        <button
                          onClick={() => toggleCardExpansion(msg.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 hover:bg-zinc-900/10 transition-all cursor-pointer"
                        >
                          <span>Details ({payload.details.length} items found)</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-zinc-900/60 space-y-1.5">
                            {payload.details.map((detail, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
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
                      <div className="flex flex-wrap gap-2 pt-1.5 relative z-10">
                        {payload.actions.map((act) => (
                          <button
                            key={act}
                            onClick={() => handleActionClick(act)}
                            className="text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(msg.sender?.username)}`}>
                    {getInitials(msg.sender?.username || "System")}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-foreground">{msg.sender?.username || "System"}</span>
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed truncate-none">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing Presence Indicator (Improvement 7) */}
        {isAiTyping && (
          <div className="flex items-start gap-3 pl-11 animate-in fade-in duration-200">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="h-4.5 w-4.5 rounded-full bg-primary/10 text-[8px] flex items-center justify-center font-black border border-primary/20 animate-pulse">🤖</span>
                <span>{aiTypingText}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <form onSubmit={handleSend} className="p-6 border-t border-zinc-900/60 bg-zinc-950/20 shrink-0">
        <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 focus-within:shadow-[0_0_12px_rgba(139,92,246,0.15)] transition-all">
          <input
            type="text"
            placeholder="Message #development... (Type @ai review / @ai summarize / @ai sprint to query AI)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-12 bg-transparent pl-4 pr-24 text-xs text-foreground outline-none border-none placeholder:text-zinc-500/60"
          />

          {/* Action icons absolute in composer bar */}
          <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
            <button
              type="button"
              className="p-1.5 text-zinc-500 hover:text-foreground rounded transition-colors cursor-pointer"
              title="Add attachment"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <button
              type="button"
              className="p-1.5 text-zinc-500 hover:text-foreground rounded transition-colors cursor-pointer"
              title="Emojis"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </button>
            <button
              type="submit"
              className="p-1.5 text-primary hover:text-primary/80 rounded transition-colors cursor-pointer"
              title="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
