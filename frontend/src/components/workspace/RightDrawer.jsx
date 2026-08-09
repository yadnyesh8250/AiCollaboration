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
      
      const isAuthError =
        err.response?.status === 401 ||
        err.response?.data?.errorType === "GEMINI_AUTH_FAILED" ||
        err.response?.data?.message?.includes("invalid credentials") ||
        err.response?.data?.message?.includes("Unauthorized") ||
        err.response?.data?.message?.includes("API_KEY_INVALID") ||
        JSON.stringify(err.response?.data).includes("451") ||
        JSON.stringify(err.response?.data).includes("401") ||
        JSON.stringify(err.response?.data).includes("credential");
      
      const errorMessage = isAuthError 
        ? "API Key Authentication Failed. The configured GEMINI_API_KEY in your backend/.env file is invalid or unauthorized. Please ensure you have set a valid Gemini API Key from Google AI Studio (starting with 'AIzaSy')."
        : (err.response?.data?.message || "Sorry, I encountered an error while processing your request. Please try again.");

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "AI", text: errorMessage }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (activeRightPanel !== "AI_COPILOT") return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[340px] lg:static border-l border-border bg-white flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-12 border-b border-border px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 select-none">
          <div className="h-6 w-6 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-3.5 h-3.5 text-violet-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">CollabAI</p>
          </div>
        </div>
        <button
          onClick={() => setRightPanel(null)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-zinc-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.sender === "AI" ? "items-start" : "items-end"}`}
          >
            <div className="flex items-center gap-1.5 select-none">
              {msg.sender === "AI" ? (
                <>
                  <div className="h-4 w-4 rounded bg-violet-100 text-[8px] flex items-center justify-center text-violet-600 font-bold">AI</div>
                  <span className="text-xs text-zinc-400 font-medium">CollabAI</span>
                </>
              ) : (
                <span className="text-xs text-zinc-400 font-medium">{msg.sender}</span>
              )}
            </div>
            <div
              className={`text-sm max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed ${msg.sender === "AI"
                  ? "bg-white border border-border text-zinc-700 shadow-sm"
                  : "bg-primary text-white font-medium"
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded bg-violet-100 text-[8px] flex items-center justify-center text-violet-600 font-bold">AI</div>
              <span className="text-xs text-zinc-400 font-medium">CollabAI</span>
            </div>
            <div className="bg-white border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-white shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask CollabAI anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isThinking}
            className="ac-input flex-1 h-10 text-sm"
          />
          <button
            type="submit"
            disabled={isThinking || !inputValue.trim()}
            className="btn-primary h-10 w-10 flex items-center justify-center px-0 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2 text-center">CollabAI can make mistakes. Verify important info.</p>
      </form>
    </aside>
  );
}
