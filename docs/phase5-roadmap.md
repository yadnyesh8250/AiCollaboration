# Phase 5 — Productivity Engine Roadmap

This roadmap defines the implementation schedule, dependency graph, and testing milestones for Phase 5 of A-Collab. The goal is to transform A-Collab into a complete workspace by unifying Tasks, Sprints, Notion-style block documents, AI automation, and Search.

---

## 🗺️ Execution Timeline

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        PHASE 5 ROADMAP                      │
  ├──────────────┬──────────────────────────────────────────────┤
  │ Week 1       │ Task Core (CRUD, Comments, Labels, Activity) │
  ├──────────────┼──────────────────────────────────────────────┤
  │ Week 2       │ Kanban, Sprints, Attachments, Sockets        │
  ├──────────────┼──────────────────────────────────────────────┤
  │ Week 3       │ Document System (Blocks, Versions, Comments) │
  ├──────────────┼──────────────────────────────────────────────┤
  │ Week 4       │ AI Assistance, Search, Dashboard, Calendar   │
  └──────────────┴──────────────────────────────────────────────┘
```

### 📅 Week 1: Core Task Management
Focus on the basic database models, services, controllers, and APIs for tasks, comments, labels, and activity history.
- [ ] **Day 1-2:** Database Schema Update (Prisma migration) & validation utilities.
- [ ] **Day 3:** Task CRUD APIs (`POST /api/workspaces/:workspaceId/tasks`, `GET`, `PATCH`, `DELETE`).
- [ ] **Day 4:** Task Comments (`/api/tasks/:taskId/comments`) and Labels (`/api/workspaces/:workspaceId/labels`).
- [ ] **Day 5:** Task Activity logger middleware. Automatically captures status, assignee, priority, and date adjustments.

### 📅 Week 2: Board Flow, Sprints & Attachments
Implement the Kanban drag-and-drop positional updates, sprint cycles, and task attachments with real-time sync.
- [ ] **Day 6-7:** Kanban Board backend support, including float-based positional reordering (Lexicographical sort).
- [ ] **Day 8:** Sprint System. Create, active, close sprint APIs, and associate Tasks to Sprints.
- [ ] **Day 9:** File upload attachment system (`/api/tasks/:taskId/attachments`).
- [ ] **Day 10:** Real-time synchronization over Socket.io (`workspace:${workspaceId}` room alerts for moves/status changes).

### 📅 Week 3: Notion-Style Collaborative Documents
Build the documents engine including nested page structures, flexible block schemas, version snapshots, and granular permissions.
- [ ] **Day 11:** Document CRUD with slug generation & hierarchical nesting support.
- [ ] **Day 12:** Block-based Content Model. CRUD for block types (Paragraph, Heading, Quote, Checklist, Image, Code, Table).
- [ ] **Day 13:** Document Comments and Version Snapshotting (saves full page states on edits).
- [ ] **Day 14:** Document Permissions Engine (Owner, Editor, Commenter, Viewer).

### 📅 Week 4: Search, AI Co-Pilot & Workspace Analytics
Connect the AI engine with tasks and docs, and build the global search index, dashboard summaries, and calendar view.
- [ ] **Day 15-16:** AI Task and Subtask Generator. Integrates Gemini API to produce structured tasks from prompts like "@task Create sprint plan".
- [ ] **Day 17:** AI Document Assistant (Summarization, automatic API documentation generator).
- [ ] **Day 18:** Global Unified Search API (`/api/search?q=authentication`) indexing tasks, messages, and docs.
- [ ] **Day 19:** Workspace Dashboard & Calendar APIs. Gather due dates, sprint deadlines, and statistics.
- [ ] **Day 20:** Verification & Handover. End-to-end integration testing and Postman collection validation.

---

## 🔗 Module Dependencies

```
[Prisma Schema Migration]
        │
        ├──► [Task CRUD] ────► [Task Comments & Labels]
        │       │
        │       └────────────► [Kanban & Sprints] ────┐
        │                                              ├─► [Dashboard & Search]
        └──► [Document CRUD] ─► [Document Blocks] ─────┘
                │
                └────────────► [Doc Versions & Permissions]
```

## 🎯 Testing & Verification Milestones

1. **Milestone 1 (End of Week 1):** Postman tests verify task creation, comment addition, and activity audit trails.
2. **Milestone 2 (End of Week 2):** Real-time workspace sockets broadcast task reordering. Sprint lifecycle (Start -> Complete) moves unfinished tasks back to the backlog.
3. **Milestone 3 (End of Week 3):** Content block validation ensures correct JSON nesting. Document permission checks block write attempts from viewers.
4. **Milestone 4 (End of Week 4):** End-to-end AI agent prompts create subtasks and summarize pages. Search matches results across messages, tasks, and documents with ranking.
