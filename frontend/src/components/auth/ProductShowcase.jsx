import React from "react";
import { motion } from "framer-motion";
import aCollabLogo from "../../assets/logo.png";
import ThreeCanvas from "./ThreeCanvas";

export default function ProductShowcase() {
  const activityLogs = [
    { text: "AI agent compiled the codebase", time: "just now", status: "success" },
    { text: "Sarah accepted the invitation", time: "2m ago", status: "info" },
    { text: "Deployed to production environment", time: "10m ago", status: "success" },
  ];

  return (
    <div className="relative flex h-full w-full flex-col justify-between p-16 bg-zinc-50 text-foreground overflow-hidden">
      {/* Interactive 3D constellation scene */}
      <ThreeCanvas />

      {/* Subtle grid mesh background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      
      {/* Radiant primary soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-3 z-10">
        <img src={aCollabLogo} alt="A-Collab Logo" className="h-9 w-9 object-contain shadow-md rounded-xl" />
        <span className="text-sm font-bold tracking-tight text-zinc-700 uppercase tracking-widest">A-COLLAB</span>
      </div>

      {/* Showcase Canvas */}
      <div className="flex-1 flex flex-col justify-center space-y-8 py-10 z-10 max-w-md mx-auto w-full">
        {/* Terminal/Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-zinc-400 font-mono ml-2">agents/nimbus-model.js</span>
            </div>
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">Active</span>
          </div>

          <div className="font-mono text-[10px] text-zinc-650 space-y-1 leading-relaxed">
            <p className="text-zinc-400">// Orchestrating AI collaboration nodes</p>
            <p><span className="text-violet-600 font-semibold">const</span> agent = <span className="text-blue-600 font-semibold">new</span> <span className="text-amber-600 font-semibold">CollabAgent</span>(&apos;nimbus-1&apos;);</p>
            <p>agent.on(<span className="text-teal-600">&apos;action&apos;</span>, (event) =&gt; &#123;</p>
            <p className="pl-4">console.log(<span className="text-teal-600">&apos;Executing workflow step:&apos;</span>, event.step);</p>
            <p className="pl-4">ui.emit(<span className="text-teal-600">&apos;render_canvas&apos;</span>, event.payload);</p>
            <p>&#125;);</p>
          </div>
        </motion.div>

        {/* Live Logs Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Live Activity Feed</h4>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            {activityLogs.map((log, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${log.status === "success" ? "bg-green-500" : "bg-primary-dark"}`} />
                  <span className="text-zinc-700 text-[11px]">{log.text}</span>
                </div>
                <span className="text-[9px] text-zinc-400 font-medium">{log.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer message */}
      <div className="text-left text-[11px] text-zinc-400 font-medium tracking-wide">
        &copy; {new Date().getFullYear()} A-Collab Platform. All rights reserved.
      </div>
    </div>
  );
}
