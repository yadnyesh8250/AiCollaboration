import React from "react";
import { Outlet } from "react-router-dom";
import ProductShowcase from "../auth/ProductShowcase";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-screen bg-zinc-50 overflow-x-hidden selection:bg-primary/20 selection:text-white">
      {/* Left Column: Premium Interactive Product Showcase (Desktop Only) */}
      <div className="hidden lg:block lg:w-1/2 h-screen sticky top-0 border-r border-zinc-200">
        <ProductShowcase />
      </div>

      {/* Right Column: Interaction Form Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen p-6 relative bg-white">
        {/* Soft elegant radial ambient glows */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

        {/* Minimal Centered Layout */}
        <div className="w-full max-w-sm space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
