import React from "react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Premium Background Mesh Gradient */}
      <div className="absolute inset-0 -z-10 bg-radial-[circle_at_center,var(--color-primary)/0.08,transparent_50%] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/5 blur-3xl -z-10 pointer-events-none" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/60 bg-card/50 p-8 backdrop-blur-md shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <span className="text-2xl font-black tracking-tighter">A</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            A-Collab
          </h2>
          <p className="text-sm text-muted-foreground">
            Enterprise AI Collaboration Workspace
          </p>
        </div>

        {/* Content Outlet */}
        <Outlet />
      </div>
    </div>
  );
}
