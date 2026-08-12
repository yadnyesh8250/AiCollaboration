import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../stores/authStore";
import aCollabLogo from "../assets/logo.png";
import ThreeCanvas from "../components/auth/ThreeCanvas";
import { 
  Sparkles, 
  MessageSquare, 
  Layers, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Shield,
  Activity
} from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans overflow-x-hidden selection:bg-primary/20 selection:text-white relative">
      {/* 3D background animation layer */}
      <ThreeCanvas />

      {/* Subtle grid mesh overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none z-0" />

      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={aCollabLogo} alt="A-Collab" className="h-8 w-8 object-contain" />
            <span className="text-sm font-bold tracking-widest text-zinc-900 uppercase">A-Collab</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-650">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-zinc-900 transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary-dark transition-colors duration-150 shadow-sm cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary-dark transition-colors duration-150 shadow-sm cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl space-y-6"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
          >
            <Sparkles className="h-3 w-3" />
            Introducing Spacious Workspace OS
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] selection:bg-primary/20"
          >
            The collaborative OS for <span className="text-primary">human & AI teams</span>.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-sm md:text-base text-zinc-550 max-w-xl mx-auto leading-relaxed"
          >
            Bring meetings, live documents, sprint kanbans, and cooperative AI agents into one fully integrated, lightning-fast workspace environment.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 text-xs font-bold text-white hover:bg-primary-dark transition-all duration-150 shadow-md cursor-pointer hover:translate-y-[-1px]"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="flex h-11 w-full sm:w-auto items-center justify-center rounded-lg border border-zinc-300 bg-white/80 px-6 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
            >
              Explore Features
            </a>
          </motion.div>
        </motion.div>

        {/* Dynamic preview canvas card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="mt-16 w-full max-w-4xl rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-md p-3 shadow-xl relative z-20 group"
        >
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-inner aspect-[16/9] flex flex-col justify-between">
            {/* Mock Dashboard Topbar */}
            <div className="h-10 border-b border-zinc-200 bg-white flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
                app.acollab.com/workspaces/eng-sprint
              </div>
              <div className="w-6" />
            </div>

            {/* Mock Dashboard Body */}
            <div className="flex-1 flex p-4 gap-4 overflow-hidden">
              {/* Left Mock Sidebar */}
              <div className="w-1/4 bg-white rounded-lg border border-zinc-200 p-3 space-y-4 hidden sm:block">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-primary/10 rounded flex items-center justify-center text-primary font-bold text-[9px]">A</div>
                  <div className="w-16 h-2.5 bg-zinc-200 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-5 bg-zinc-100 rounded-md border border-zinc-200" />
                  <div className="w-full h-5 bg-zinc-550/5 rounded-md" />
                  <div className="w-full h-5 bg-zinc-550/5 rounded-md" />
                </div>
              </div>

              {/* Right Mock Main Content */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-zinc-200">
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 bg-zinc-900 rounded" />
                    <div className="w-40 h-2 bg-zinc-400 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-primary/10 text-primary text-[9px] font-bold rounded-full flex items-center justify-center border border-primary/20">Active</div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  {/* Mock Chat Card */}
                  <div className="bg-white p-3 rounded-lg border border-zinc-200 flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <MessageSquare className="h-3 w-3 text-primary" />
                      <div className="w-16 h-2 bg-zinc-950 rounded" />
                    </div>
                    <div className="space-y-2 flex-1 pt-3">
                      <div className="flex gap-2 items-start">
                        <div className="w-4 h-4 rounded-full bg-zinc-300" />
                        <div className="flex-1 space-y-1">
                          <div className="w-12 h-2 bg-zinc-400 rounded" />
                          <div className="w-20 h-1.5 bg-zinc-300 rounded" />
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <div className="w-4 h-4 rounded-full bg-primary/20" />
                        <div className="flex-1 space-y-1">
                          <div className="w-16 h-2 bg-primary/50 rounded" />
                          <div className="w-24 h-1.5 bg-zinc-300 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mock Task Kanban Card */}
                  <div className="bg-white p-3 rounded-lg border border-zinc-200 flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <Layers className="h-3 w-3 text-emerald-500" />
                      <div className="w-16 h-2 bg-zinc-950 rounded" />
                    </div>
                    <div className="space-y-2 pt-3">
                      <div className="p-2 border border-zinc-150 rounded-md bg-zinc-50 flex items-center justify-between">
                        <div className="w-16 h-2 bg-zinc-600 rounded" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="p-2 border border-zinc-150 rounded-md bg-zinc-50 flex items-center justify-between">
                        <div className="w-20 h-2 bg-zinc-600 rounded" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="relative z-10 bg-white border-y border-zinc-200 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Designed for modern product engineering</h2>
            <p className="text-xs text-zinc-550">Eliminate fragment tools and run your collaborative workflow in one unified window.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 space-y-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">AI Meeting-to-Workflow</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">
                Paste meeting transcripts or whiteboard notes. Our embedded agent parses targets, generates kanban tasks, assigns responsibilities, and compiles documentation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 space-y-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">Real-Time Canvas Editors</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">
                Draft specifications or project briefs side-by-side with colleagues. Built-in web socket cursor tracking provides fluid collaboration with granular block permissions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 space-y-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">Autonomous AI Agents</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">
                Add virtual developers and designers into your channels. AI agents complete tasks in the backlog, write pull requests, run builds, and document code blocks autonomously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Showcase */}
      <section id="workflow" className="relative z-10 py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-200/60 px-2 py-0.5 rounded-full">
              Flagship Pipeline
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
              One transcript. Fully structured execution.
            </h2>
            <p className="text-xs text-zinc-550 leading-relaxed">
              Tired of meetings that result in zero action? A-Collab automatically processes discussions, breaks them down into task components, creates sprints, and writes technical documents in seconds.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-zinc-800">Direct integration with Zoom/Slack transcripts</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-zinc-800">Auto-assign tasks based on speaker workloads</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-zinc-800">Dynamic versioning and change control for briefs</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-150 pb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-zinc-800">CollabAI Pipeline Optimizer</span>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">1. Paste Raw Transcript</div>
                <div className="text-[11px] text-zinc-650 mt-1 truncate">"Sarah: Let's launch the register component page next week. Dave, build the container..."</div>
              </div>
              <div className="flex justify-center">
                <div className="h-6 w-0.5 bg-zinc-300 border-dashed border" />
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-primary font-bold uppercase">2. AI Generation Complete</div>
                  <div className="text-[11px] text-zinc-650 mt-1 font-semibold">4 Tasks + 1 Spec Document created</div>
                </div>
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Tiers Section */}
      <section id="pricing" className="relative z-10 py-24 bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Simple, direct workspace tiers</h2>
            <p className="text-xs text-zinc-550">Scale your collaboration capabilities as your human & agent team grows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8 text-left">
            {/* Free Tier */}
            <div className="p-8 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Community</h3>
                <div className="mt-4 flex items-baseline text-zinc-900">
                  <span className="text-3xl font-extrabold tracking-tight">$0</span>
                  <span className="ml-1 text-xs text-zinc-550">/ month</span>
                </div>
                <p className="mt-4 text-xs text-zinc-550">Perfect for small teams launching their first collaborative space.</p>
                <ul className="mt-6 space-y-3 text-xs text-zinc-650">
                  <li className="flex items-center gap-2">✓ Unlimited flat workspaces</li>
                  <li className="flex items-center gap-2">✓ Real-time document editors</li>
                  <li className="flex items-center gap-2">✓ Basic kanban task planner</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-8 flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                Sign Up Now
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-xl border border-primary bg-white flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold uppercase px-3 py-1 rounded-bl-lg">Popular</div>
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Enterprise OS</h3>
                <div className="mt-4 flex items-baseline text-zinc-900">
                  <span className="text-3xl font-extrabold tracking-tight">$29</span>
                  <span className="ml-1 text-xs text-zinc-550">/ seat / mo</span>
                </div>
                <p className="mt-4 text-xs text-zinc-550">Advanced agent tools, cost tracking, and security controls.</p>
                <ul className="mt-6 space-y-3 text-xs text-zinc-650">
                  <li className="flex items-center gap-2">✓ <strong>Cooperative AI Agents</strong></li>
                  <li className="flex items-center gap-2">✓ AI Meeting-to-Workflow pipeline</li>
                  <li className="flex items-center gap-2">✓ Custom Gemini bot personas</li>
                  <li className="flex items-center gap-2">✓ Cost & token consumption audit logs</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-8 flex h-10 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary-dark transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-zinc-50 border-t border-zinc-200 py-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={aCollabLogo} alt="A-Collab Logo" className="h-5 w-5 object-contain" />
            <span className="font-bold tracking-widest text-zinc-700 uppercase text-[10px]">A-COLLAB OS</span>
          </div>
          <div>© {new Date().getFullYear()} A-Collab OS. Built with premium design reasoning intelligence.</div>
          <div className="flex gap-4">
            <a href="#features" className="hover:underline">Privacy</a>
            <a href="#features" className="hover:underline">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
