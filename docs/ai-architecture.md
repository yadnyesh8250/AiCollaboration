# AI System Architecture

This document describes the high-level system architecture of the **Enterprise AI Workspace Assistant Framework** in A-Collab.

## 🏗️ Architectural Diagram

```
       ┌────────────────────────────────────────────────────────┐
       │                       Client                           │
       └───────┬────────────────────────────────────────▲───────┘
               │                                        │
    REST / HTTP (Prompt/Actions)            Socket.io (Real-time Streaming)
               │                                        │
       ┌───────▼────────────────────────────────────────┴───────┐
       │                  AI Gateway Interface                  │
       │     (Authorizes, checks permissions, limits)          │
       └───────┬────────────────────────────────────────▲───────┘
               │                                        │
               ├────────────────────────────────────────┤
               ▼                                        ▼
       ┌───────────────┐                        ┌───────────────┐
       │Context Engine │                        │ Agent Router  │
       │ (RAG & Rank)  │                        │  (Selectors)  │
       └───────┬───────┘                        └───────┬───────┘
               │                                        │
               ▼                                        ▼
       ┌───────────────┐                        ┌───────────────┐
       │    Memory     │                        │ Tool Registry │
       │  (Knowledge)  │                        │ (Action Exec) │
       └───────┬───────┘                        └───────┬───────┘
               │                                        │
               └───────────────────┬────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                     Model Gateway                      │
       │   (Gemini API / OpenAI / Claude Adapter & Cache)       │
       └───────────────────────────┬────────────────────────────┘
                                   │
                           Pushes async jobs
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                        AI Queue                        │
       │        (BullMQ / Redis or DB-backed Job Queue)         │
       └───────────────────────────┬────────────────────────────┘
                                   │
                           Processed by
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                       AI Worker                        │
       │   (Async task processor / Background Cron summaries)   │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
                            Database (MySQL)
```

## 🧩 Architectural Components

### 1. AI Gateway
The entry point for all AI requests. It:
- Enforces authentication & checks workspace membership.
- Audits AI API usage limits, cost tracking (USD), and credits.
- Controls AI Permissions & Personas: Dynamically configures the system prompt and allowed tools per workspace.

### 2. Agent Router & Planner
Routes requests to specialized agents:
- `@ai` (General Assistant)
- `@task` (Task Assistant)
- `@docs` (Document Assistant)
It utilizes an **AI Planner** to dynamically analyze the query and orchestrate tool executions (e.g. searching messages first, then updating a task) rather than replying directly.

### 3. Context Engine & Caching
Aggregates and prioritizes context. It integrates an **AI Cache** to intercept queries and return cached results (with a Configurable Time-To-Live) if the exact prompt context has already been answered, saving model API costs.

### 4. Tool Registry
A registry of tools declared as JSON schemas passed to the LLM (Function Calling). Handles parameter mapping and authorization.

### 5. Model Gateway (Abstraction)
Adapter-based interface wrapping model providers (Gemini, OpenAI, Claude). Exposes a unified API for streaming, cost calculation (USD based on prompt/completion tokens), and tool schema submission.

### 6. AI Queue & Worker
For heavy, non-real-time operations (e.g., generating weekly reports, processing files):
- Requests are pushed to the **AI Queue**.
- The **AI Worker** processes jobs asynchronously to prevent HTTP request timeouts.
- Dedicated crons trigger daily (9 AM) and weekly (Friday) summary jobs.
