# A-Collab

> **AI-powered collaborative workspace for modern teams.**

A-Collab brings **team communication, task management, documentation, sprint planning, real-time collaboration, and workspace-aware AI** into one unified platform.

Instead of switching between multiple tools, teams can discuss work, turn conversations into tasks, manage projects, document decisions, and use AI directly within their workspace.

---

## ✨ Features

- 🔐 **Authentication** — JWT authentication, refresh sessions, GitHub OAuth
- 🏢 **Organizations & Workspaces** — Create, join, and collaborate in workspaces
- 💬 **Real-Time Chat** — Channels, messages, threads, and Socket.io updates
- 📋 **Task Management** — Kanban boards, assignments, priorities, deadlines, and comments
- 🏃 **Sprint Management** — Plan and track team sprints
- 📄 **Collaborative Documents** — Block-based documents with versioning and permissions
- 🔔 **Notifications** — Real-time workspace notifications
- 👥 **Presence** — See where team members are working in real time
- 🤖 **CollabAI** — AI that understands tasks, sprints, documents, and workspace context
- 🧠 **AI Workflows** — Convert meeting discussions into tasks, documentation, and notifications

---

## 🤖 CollabAI

A-Collab's AI is designed to work **with the workspace**, not as a separate generic chatbot.

For example:

```text
"What is blocking the current sprint?"
              ↓
       Workspace Context
              ↓
     Tasks + Sprints + Docs
              ↓
           Gemini
              ↓
      Contextual Answer

It can answer questions such as:

What is blocking the current sprint?
What tasks are assigned to me?
Summarize today's workspace activity.
What did the team decide about authentication?
Plan the remaining sprint.
🔄 Meeting → Workflow

A-Collab can turn meeting discussions into actual workspace actions:

Meeting Transcript
       ↓
     Gemini
       ↓
Decisions + Action Items
       ↓
 Tasks + Assignees
       ↓
      Sprint
       ↓
 Documentation
       ↓
 Notifications
🏗️ Tech Stack

Frontend

React · Vite · React Router · Zustand · TanStack Query · Axios · Socket.io · Zod · React Hook Form

Backend

Node.js · Express · Prisma · MySQL · Redis · Socket.io · JWT · Gemini API

Infrastructure

Docker · Docker Compose · PM2 · Redis · Prisma Migrations

🧩 Architecture
        React + Vite
             │
      REST + Socket.io
             │
        Express API
       ┌─────┼─────┐
       ↓     ↓     ↓
     MySQL Redis Gemini
       │
    Prisma
🚀 Getting Started
Clone
git clone https://github.com/yadnyesh8250/AiCollaboration.git
cd AiCollaboration
Backend
cd backend
npm install

Create .env:

PORT=5001
DATABASE_URL=your_mysql_url
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GEMINI_API_KEY=your_gemini_api_key

Then:

npx prisma generate
npx prisma migrate dev
npm run dev
Frontend
cd frontend
npm install
npm run dev
📌 Project Status

A-Collab is actively being developed toward a production-ready collaborative workspace.

Current focus:

Production deployment
Transactional email
Microsoft authentication
Advanced real-time collaboration
Improved semantic search
Performance and production monitoring
🎯 Vision

Conversation → Context → AI → Action → Collaboration

A-Collab aims to make AI a contextual teammate that understands what a team is discussing, what they are building, what is documented, and what needs to happen next.

Built with ❤️ using React, Node.js, MySQL, Redis, Socket.io & Gemini.

This is the version I'd actually put on your GitHub: **~100 lines, readable, professional, and enough technical depth without becoming documentation.**
