import React, { useState } from "react";
import { useUIStore } from "../../stores/uiStore";

export default function RightDrawer() {
  const { activeRightPanel, setRightPanel } = useUIStore();
  const [messages, setMessages] = useState([
    { id: 1, sender: "AI", text: "Hello! Analyzing Sprint 13 progress. Need updates on V2 UI design?" },
    { id: 2, sender: "Sarah", text: "What's the status?" },
    { id: 3, sender: "AI", text: "TASK-13 'Finalize UI Design' is currently in Review. Feedback pending from Mark." },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMsgs = [
      ...messages,
      { id: Date.now(), sender: "Sarah", text: inputValue },
    ];
    setMessages(newMsgs);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "AI",
          text: `Analyzing context for: "${inputValue}". Let me compile a summary card...`,
        },
      ]);
    }, 1000);
  };

  if (!activeRightPanel) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] lg:static border-l border-zinc-900/60 bg-zinc-950 flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 border-b border-zinc-900/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-primary animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-8.979M19 12l-8.982 8.979M15 12h-4.5m4.5-9H9v9" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">AI Copilot</span>
        </div>
        <button
          onClick={() => setRightPanel(null)}
          className="text-zinc-500 hover:text-foreground cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1.5 ${msg.sender === "AI" ? "items-start" : "items-end"}`}
          >
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              {msg.sender === "AI" ? (
                <>
                  <div className="h-4 w-4 rounded-full bg-primary/20 text-[8px] flex items-center justify-center text-primary font-black border border-primary/30">AI</div>
                  <span>CollabAI</span>
                </>
              ) : (
                <span>Sarah J.</span>
              )}
            </div>
            <div
              className={`text-xs max-w-[85%] rounded-lg p-3 leading-relaxed border transition-all ${
                msg.sender === "AI"
                  ? "bg-zinc-900/20 border-zinc-900 text-zinc-300 shadow-sm"
                  : "bg-primary/10 border-primary/20 text-primary-foreground shadow-sm shadow-primary/5"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Input Container */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-900/60 bg-zinc-950 shrink-0">
        <input
          type="text"
          placeholder="Ask Copilot..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 text-xs text-foreground placeholder:text-zinc-500/60 transition-all duration-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      </form>
    </aside>
  );
}
