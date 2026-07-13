import React from "react";
import { Outlet } from "react-router-dom";
import ProductShowcase from "../auth/ProductShowcase";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-screen bg-zinc-950 overflow-x-hidden">
      {/* Left Column: Product Showcase (Desktop Only) */}
      <div className="hidden lg:block lg:w-1/2 h-screen sticky top-0 border-r border-zinc-800/40">
        <ProductShowcase />
      </div>

      {/* Right Column: Interaction Form Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen p-6 relative">
        {/* Soft violet glow */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,var(--color-primary)/0.03,transparent_60%] pointer-events-none" />

        {/* Center card wrapper */}
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
