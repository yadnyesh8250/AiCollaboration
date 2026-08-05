import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../services/api/client";

export default function RightDrawer() {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const { activeRightPanel, setRightPanel } = useUIStore();

  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch or initialize conversation
  useEffect(() => {
    if (!workspaceId || activeRightPanel !== "AI_COPILOT") return;

    const initConversation = async () => {
      try {
        setIsThinking(true);
        // List existing conversations for workspace
        const res = await api.get(`/workspaces/${workspaceId}/ai/conversations`);
        const conversations = res.data.conversations || [];

        if (conversations.length > 0) {
          // Select most recent conversation
          setActiveConversationId(conversations[0].id);
          // Set initial greeting
          setMessages([
            { id: "greet", sender: "AI", text: `Hello! I am CollabAI. I am connected to your ${workspaceId ? "workspace" : ""} context. Ask me anything about tasks, documents, or team workflows!` }
          ]);
        } else {
          // Create new conversation
          const createRes = await api.post(`/workspaces/${workspaceId}/ai/conversations`, {
            title: "CollabAI Helper"
          });
          setActiveConversationId(createRes.data.conversation.id);
          setMessages([
            { id: "greet", sender: "AI", text: "Hello! I am CollabAI. I have set up a new conversation session for you. Ask me anything!" }
          ]);
        }
      } catch (err) {
        console.error("Failed to initialize AI conversation:", err);
        setMessages([
          { id: "err", sender: "AI", text: "Failed to connect to the AI service. Please make sure the backend server is running and database is fully synced." }
        ]);
      } finally {
        setIsThinking(false);
      }
    };

    initConversation();
  }, [workspaceId, activeRightPanel]);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userText = inputValue.trim();
    setInputValue("");

    // Append user message locally
    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: user?.username || "You", text: userText }
    ]);

    setIsThinking(true);

    try {
      let convId = activeConversationId;

      // Fallback: If no conversation ID, create one
      if (!convId) {
        const createRes = await api.post(`/workspaces/${workspaceId}/ai/conversations`, {
          title: "CollabAI Helper"
        });
        convId = createRes.data.conversation.id;
        setActiveConversationId(convId);
      }

      // Query Gemini API
      const response = await api.post(`/ai/conversations/${convId}/messages`, {
        prompt: userText
      });

      const aiMsg = response.data.aiResponse;
      setMessages((prev) => [
        ...prev,
        { id: aiMsg.id || Date.now() + 1, sender: "AI", text: aiMsg.content }
      ]);
    } catch (err) {
      console.error("AI Request failed:", err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "AI", text: "Sorry, I encountered an error while processing your request. Please try again." }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (activeRightPanel !== "AI_COPILOT") return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[360px] lg:static border-l border-zinc-950 bg-[#030303] flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-12 border-b border-zinc-950 px-4 flex items-center justify-between shrink-0 bg-black/30">
        <div className="flex items-center gap-2 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-3.5 h-3.5 text-purple-400 animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">AI Copilot</span>
        </div>
        <button
          onClick={() => setRightPanel(null)}
          className="text-zinc-600 hover:text-white cursor-pointer transition-colors p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1 ${msg.sender === "AI" ? "items-start" : "items-end"}`}
          >
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-600 uppercase tracking-widest select-none">
              {msg.sender === "AI" ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full bg-purple-950/20 text-[7px] flex items-center justify-center text-purple-450 font-black border border-purple-900/30">AI</div>
                  <span>CollabAI</span>
                </>
              ) : (
                <span>{msg.sender}</span>
              )}
            </div>
            <div
              className={`text-xs max-w-[88%] rounded-xl p-3 leading-relaxed border transition-all ${msg.sender === "AI"
                  ? "bg-zinc-950/40 border-zinc-950 text-zinc-350 shadow-sm"
                  : "bg-white text-black border-transparent font-medium shadow-sm"
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex flex-col space-y-1 items-start animate-pulse">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-650 uppercase tracking-widest">
              <div className="h-3.5 w-3.5 rounded-full bg-purple-950/20 text-[7px] flex items-center justify-center text-purple-450 font-black border border-purple-900/30">AI</div>
              <span>CollabAI</span>
            </div>
            <div className="text-[10px] text-zinc-600 italic bg-zinc-950/20 border border-zinc-955 rounded-xl p-2.5">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-955 bg-black/25 shrink-0">
        <input
          type="text"
          placeholder="Ask Copilot..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isThinking}
          className="w-full h-9 rounded-lg border border-zinc-900 bg-zinc-950/40 px-3 text-xs text-foreground placeholder:text-zinc-650 outline-none focus:border-zinc-800 transition-all"
        />
      </form>
    </aside>
  );
}
