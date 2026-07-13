import React from "react";
import { motion } from "framer-motion";

export default function ProductShowcase() {
  const teamMembers = [
    { name: "Sarah", role: "Product Manager", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", initials: "SC" },
    { name: "Alex", role: "Frontend Dev", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", initials: "AD" },
    { name: "Ben", role: "Backend Dev", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", initials: "BJ" },
    { name: "Mia", role: "Designer", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", initials: "MW" },
    { name: "Chloe", role: "QA Engineer", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", initials: "CR" },
  ];

  return (
    <div className="relative flex h-full w-full flex-col justify-between p-12 bg-zinc-950 text-foreground overflow-hidden">
      {/* Subtle grid mesh background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-2.5 z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
          <span className="text-xl font-black tracking-tighter">A</span>
        </div>
        <span className="text-xl font-bold tracking-tight">A-Collab</span>
      </div>

      {/* Showcase Canvas matching approved Figma layout */}
      <div className="flex-1 flex items-center justify-center py-10 z-10">
        <div className="w-full max-w-lg rounded-2xl border border-white/5 bg-zinc-900/10 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          
          {/* Project Section: Kanban Board */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400">Project: Nimbus 2.0</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">v1.0.0</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* To Do Column */}
              <div className="rounded-xl border border-border/20 bg-zinc-950/40 p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">To Do</span>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-2">
                  <p className="text-[11px] font-semibold text-zinc-200">Design UI System</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] bg-purple-500/10 text-purple-400 px-1 py-0.5 rounded font-bold border border-purple-500/20">UI</span>
                    <span className="h-4 w-4 rounded-full bg-zinc-800 text-[8px] flex items-center justify-center font-bold text-zinc-400">MW</span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-2">
                  <p className="text-[11px] font-semibold text-zinc-200">Test WorkFlow</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded font-bold">QA</span>
                    <span className="h-4 w-4 rounded-full bg-zinc-800 text-[8px] flex items-center justify-center font-bold text-zinc-400">CR</span>
                  </div>
                </div>
              </div>

              {/* In Progress Column */}
              <div className="rounded-xl border border-border/20 bg-zinc-950/40 p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">In Progress</span>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-2 border-l-2 border-l-primary">
                  <p className="text-[11px] font-semibold text-zinc-200">Develop Login API</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] bg-primary/10 text-primary px-1 py-0.5 rounded font-bold border border-primary/20">DEV</span>
                    <span className="h-4 w-4 rounded-full bg-primary/20 text-[8px] flex items-center justify-center font-bold text-primary">BJ</span>
                  </div>
                </div>
              </div>

              {/* Done Column */}
              <div className="rounded-xl border border-border/20 bg-zinc-950/40 p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Done</span>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-2">
                  <p className="text-[11px] font-semibold text-zinc-300 line-through">Setup DB</p>
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded font-bold">OPS</span>
                    <span className="h-4 w-4 rounded-full bg-zinc-800 text-[8px] flex items-center justify-center font-bold text-zinc-500">AD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Workflow Section */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <span className="text-xs font-bold text-zinc-400">Team Workflow</span>
            <div className="rounded-xl border border-border/20 bg-zinc-950/40 p-4 relative overflow-hidden h-[120px] flex items-center justify-center">
              
              {/* Decorative connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="20%" y1="50%" x2="40%" y2="25%" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" />
                <line x1="40%" y1="25%" x2="60%" y2="75%" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" />
                <line x1="60%" y1="75%" x2="80%" y2="50%" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" />
                <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="rgba(20,184,166,0.3)" strokeWidth="1.5" />
                <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(20,184,166,0.3)" strokeWidth="1.5" />
              </svg>

              <div className="flex w-full justify-between px-4 relative z-10">
                {teamMembers.map((member, i) => (
                  <motion.div
                    key={member.name}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 120 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold ${member.color}`}>
                      {member.initials}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">{member.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Footer message */}
      <div className="text-center text-xs text-zinc-500 font-medium">
        Empowering Teams with AI-Driven Collaboration.
      </div>
    </div>
  );
}
