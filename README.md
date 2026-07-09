# A-Collab — Enterprise Workspace & Generative AI Assistant

A-Collab is a comprehensive, production-grade workspace collaboration platform that unifies real-time communications, organization management, project planning, Notion-style collaborative documents, global search, and contextual AI agent pipelines into a single high-performance engine.

---

## 🚀 Key Features

* **Hierarchy & Membership:** Multi-tenant Organizations hosting isolated Workspaces with rigid Role-Based Access Control (RBAC).
* **Real-Time Communication:** Persistent channels, threaded replies, typing indicators, user presence states, emoji reactions, and file uploads running over Socket.io with horizontal Redis scaling.
* **Productivity Engine:** Jira-style task boards utilizing float-based Lexicographical positioning for $O(1)$ reordering, sprint lifecycles, and customizable task labels.
* **Notion-Style Documents:** Block-structured pages supporting nested hierarchical documents, collaborative comments, block reordering, and version snapshot histories.
* **Generative AI Assistant:** Gemini 2.5/3.5 powered agents with decoupled tool registries, AI-governed workspace permissions, cost tracking (USD), caching layer, RAG context injection, and asynchronous daily summarization cron workers.
* **Unified Search:** Sub-100ms multi-entity search across tasks, messages, channels, documents, and RAG knowledge.

---

## 🛠️ Technology Stack

* **Backend Framework:** Node.js, Express.js
* **Real-time Protocol:** Socket.io (with Redis Pub/Sub adapter for clustering)
* **Database & ORM:** MySQL with Prisma ORM (v6)
* **Cache & Queue:** Redis (main cache, BullMQ AI job worker log)
* **Security & Auth:** JWT Access/Refresh tokens, bcrypt password hashing, Express rate-limiters, Helmet, and CORS policies
* **Logging & Observability:** Pino JSON structured logs, health checks (`/live`, `/ready`, `/health`)

---

## 🗺️ Project Roadmap & Status

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                                A-COLLAB                                │
   ├───────────┬───────────┬──────────────┬──────────────────┬──────────────┤
   │ Phase 1   │ Phase 2   │ Phase 3      │ Phase 4          │ Phase 5      │
   │ Identity  │ Org &     │ Real-time    │ Generative AI    │ Productivity │
   │ & Auth    │ Workspace │ Chat Engine  │ Assistant        │ Engine       │
   │ (Done)    │ (Done)    │ (Done)       │ (Done)           │ (Done)       │
   └───────────┴───────────┴──────────────┴──────────────────┴──────────────┘
```

* **Phase 1 (Identity):** Database schema, register/login APIs, database-backed Session management, profile configuration.
* **Phase 2 (Org & Workspace):** Organizations and workspace creation, Member permissions, workspace invitations.
* **Phase 3 (Real-time Communication):** Channel routing, text/media messages, read receipts, threaded replies, reactions.
* **Phase 4 (Generative AI):** Chat trees, agent personas, tool permission configurations, USD cost logging, RAG caching.
* **Phase 5 (Productivity):** Kanban boards, sprint tracking, nested block document models, unified search index, dashboard analytics.

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** v20.x or later
* **MySQL** v8.0 or later
* **Redis** (optional fallback configuration supported)

### Local Environment Setup
1. **Navigate to the Backend:**
   ```bash
   cd backend
   ```
2. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` folder matching the variables listed in `DEPLOYMENT.md` (e.g. `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, etc.).
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Deploy Database Schema:**
   ```bash
   npx prisma migrate dev
   ```
5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   *The server runs on port `5001`.*

### Docker Setup
Run this command from the project root to spin up MySQL, Redis, and the backend application:
```bash
docker-compose up --build -d
```
Docker compose will automatically run database migrations and health check processes.

---

## 📚 Documentation Catalog

Use these documents to understand the architecture, algorithms, and APIs in depth:

### 🏗️ Architecture & Flow Diagrams
* [System Architecture Overview](file:///Users/yadnyesh8250/Desktop/A-collab/docs/architecture.md) — Multi-service layout, data flows, folder structures.
* [AI Assistant Architecture](file:///Users/yadnyesh8250/Desktop/A-collab/docs/ai-architecture.md) — Agent routers, planners, tool schemas, and queue workers.
* [AI Sequence Diagrams](file:///Users/yadnyesh8250/Desktop/A-collab/docs/ai-sequence-diagrams.md) — Execution flow for AI caching and async crons.
* [RAG Context Engine & Caching](file:///Users/yadnyesh8250/Desktop/A-collab/docs/rag-design.md) — Vector weighting heuristics and query hash generation.
* [Kanban Positioning & Sockets](file:///Users/yadnyesh8250/Desktop/A-collab/docs/kanban-flow.md) — Lexicographical float re-spacing algorithm.
* [Unified Search Index Flow](file:///Users/yadnyesh8250/Desktop/A-collab/docs/search-architecture.md) — High-speed concurrent DB queries and scoring.

### 🗄️ Database Schemas & ER Diagrams
* [Task Management Database ER](file:///Users/yadnyesh8250/Desktop/A-collab/docs/task-er-diagram.md) — Board tasks, sprints, activities, and label schemas.
* [Notion Document Database ER](file:///Users/yadnyesh8250/Desktop/A-collab/docs/document-er-diagram.md) — Block hierarchy, page permissions, and versions.
* [AI Agent Database ER](file:///Users/yadnyesh8250/Desktop/A-collab/docs/ai-database.md) — Auditing, config templates, and session cache storage.

### 📡 API Specifications
* [Core HTTP & Socket Spec](file:///Users/yadnyesh8250/Desktop/A-collab/docs/core-api-spec.md) — Auth, User Profile, Workspace, and Communication sockets.
* [Productivity Engine API Spec](file:///Users/yadnyesh8250/Desktop/A-collab/docs/api-spec.md) — Task board, sprints, documents, search, and dashboard.
* [Generative AI API Spec](file:///Users/yadnyesh8250/Desktop/A-collab/docs/ai-api.md) — Conversations, config, analytics, and job templates.

### 🧪 Verification & Testing Guides
* [Phase 2 (Workspace RBAC)](file:///Users/yadnyesh8250/Desktop/A-collab/TESTING_GUIDE.md) — Step-by-step Postman guide for permissions and invites.
* [Phase 3 (Communication)](file:///Users/yadnyesh8250/Desktop/A-collab/PHASE_3_TESTING_GUIDE.md) — Step-by-step guide for messages, reactions, threads.
* [Phase 4 (AI Assistant)](file:///Users/yadnyesh8250/Desktop/A-collab/PHASE_4_TESTING_GUIDE.md) — Testing details for context queries, analytics, and tool blocks.
