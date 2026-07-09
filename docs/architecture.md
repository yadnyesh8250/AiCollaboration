# A-Collab System Architecture Overview

This document describes the end-to-end system architecture of A-Collab. It maps the overall design layers, project directory structure, core patterns, and horizontal scaling strategies.

---

## 🏗️ 1. Multi-Layer Architecture

A-Collab utilizes a layered architecture combining synchronous HTTP REST API transactions, asynchronous background job queuing, and real-time WebSocket state replication:

```
                               ┌──────────────────┐
                               │  Client Browser  │
                               └────────┬─────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      │          Load Balancer            │
                      └─────────────────┬─────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼ (REST/HTTP)                                 ▼ (WebSockets)
     ┌───────────────────────┐                     ┌───────────────────────┐
     │  Express HTTP Server  │                     │  Socket.io WS Server  │
     └───────────┬───────────┘                     └───────────┬───────────┘
                 │                                             │
                 ├──────────────────────┬──────────────────────┤
                 ▼                      ▼                      ▼
       ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
       │   Services Layer │   │  Cache / PubSub  │   │  Job Queue (Redis)│
       │ (Prisma ORM Client)  │     (Redis)      │   │     (BullMQ)     │
       └─────────┬────────┘   └──────────────────┘   └─────────┬────────┘
                 │                                             │
                 ▼                                             ▼
       ┌──────────────────┐                          ┌──────────────────┐
       │  MySQL Database  │                          │    AI Worker     │
       └──────────────────┘                          └─────────┬────────┘
                                                               │
                                                               ▼
                                                     ┌──────────────────┐
                                                     │    Gemini API    │
                                                     └──────────────────┘
```

### Key Architectural Layers

1. **Client Interface:** Renders the frontend interface and initiates both Socket.io connections for real-time streams and HTTP clients for REST endpoints.
2. **HTTP API Gateway:** Express.js routing controller validating inputs (via Joi/Zod validations), handling CORS, rate-limiting, authentication guards, and database transactions.
3. **Real-time Event Broker:** Socket.io managing connection namespaces, rooms (`workspace:*` and `channel:*`), typing signals, and presence.
4. **Data Persistence (MySQL & Prisma):** MySQL handles structured application schemas. Prisma ORM translates entity queries and implements migration logic.
5. **State Caching & Message Distribution (Redis):** Redis serves as a fast storage cache for prompt responses and provides pub/sub orchestration for Socket.io adapter replication.
6. **Task Workers & Generative AI (BullMQ & Gemini):** Heavy async tasks (such as daily workspace summarization crons) are pushed to the background Redis queue and executed by the AI Worker via the Gemini Model Gateway.

---

## 📂 2. Backend Directory Structure

The backend source code under `/backend/src` is structured modularly:

```
backend/src/
├── config/             # Environment, database, and Redis configuration
├── controllers/        # Express request controllers for Core modules (Phases 1-3)
├── middleware/         # Auth verification, RBAC rules, logging, rate limits
├── models/             # Custom models or DB extensions
├── modules/            # Phase 5 Productivity Engine components (Modular structure)
│   ├── attachment/     # Task attachments module
│   ├── comment/        # Task & Document comments module
│   ├── dashboard/      # Workspace metrics and overview details
│   ├── document/       # Collaborative Notion-style documents module
│   ├── label/          # Categorization labels module
│   ├── search/         # Unified global search engine
│   ├── sprint/         # Agile sprint cycle management
│   └── task/           # Kanban boards and tasks module
├── routes/             # Core routes mapping (Phases 1-4)
├── services/           # External API adapters (Gemini, BullMQ queues)
├── socket/             # WebSocket handlers, rooms, presence
├── utils/              # Structured logging (Pino) and token signing (JWT)
└── validations/        # Request payload Joi/Zod validation schemas
```

---

## 📐 3. Core Design Patterns

### Database-Backed Session Management
To prevent JWT refresh tokens from remaining valid if a token is leaked, A-Collab implements a database-backed `Session` table.
* **Logout:** Deletes the specific `Session` record, rendering the refresh token immediately invalid.
* **Logout-All:** Deletes all session records associated with a `userId`, logging the user out across all devices.

### Workspace Role-Based Access Control (RBAC)
Permission checks are handled inside Express middleware (`requireWorkspaceRole` and `requireOrgRole`). It intercepts routes containing `:workspaceId` or `:orgId`, verifies workspace/org membership, checks user roles against permissible roles, and blocks unauthorized requests early (returning `403 Forbidden`).

### Soft-Deletion of Message Logs
For data compliance and thread integrity, deleting a chat message does not purge it from the `Message` table. Instead:
1. The backend sets `deletedAt = now()`.
2. The message content field is replaced with `"This message was deleted."`.
3. Reactions and attachment links are updated to maintain clean thread history.

### Fractional Lexicographical Positioning
To sort tasks on a Kanban board without writing slow $O(N)$ reordering queries, A-Collab uses a floating point position index (`position`).
* Moving a card between two cards with positions $A$ and $B$ assigns the card the position $\frac{A + B}{2}$.
* Gaps are monitored; if the float gap shrinks below $10^{-5}$, a background job is scheduled to clean and re-space tasks.

### Decoupled AI Tool Registry
AI agents call tools dynamically via Gemini Function Calling. The system registers tools (such as `createTask`, `createDocument`) as JSON schemas inside a decoupled tool registry. The agent router validates workspace permission states (`AIPermission` table) before executing the actual function, isolating model logic from domain rules.

---

## ⚡ 4. Horizontal Scaling & Clustering

A-Collab is built to scale horizontally using a stateless backend architecture:

### 1. WebSockets Sync (Redis Pub/Sub)
By default, Socket.io only tracks client connections in-memory. If a user connects to Instance 1, and another connects to Instance 2, they cannot receive each other's messages.
* **Solution:** We mount the `@socket.io/redis-adapter` using duplicates of the primary Redis client.
* **Flow:** Any Socket event emitted on Instance 1 is published to Redis and automatically broadcasted to client sessions connected to Instance 2.

### 2. Distributed Queues
AI Worker crons run inside isolated Node worker instances. BullMQ relies on Redis lists to manage task distribution, ensuring that multiple Express servers can share a single background queue without duplicate job execution.
