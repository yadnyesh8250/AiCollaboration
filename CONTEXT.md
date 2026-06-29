# A-Collab Project Context

## 🎯 Main Goal
A-Collab is a comprehensive workspace-based collaboration platform. It aims to integrate organization management, real-time chat, and AI capabilities into a seamless experience.

## 🏗️ Architecture & Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **ORM:** Prisma (v6)
- **Auth:** JWT (JSON Web Tokens) with Bcrypt for password hashing

## 🗺️ Project Roadmap & Current Status

### Phase 1: Identity Module (Current Focus)
- [x] Prisma User Schema
- [x] Basic Registration API (`/api/auth/register`)
- [x] Basic Login API (`/api/auth/login`)
- [x] Session Management (Refresh Tokens, Logout, Logout-all)
- [x] User Profile Management (Bio, Avatar, Name)
- [x] Password Change & Security

### Phase 2: Organization & Workspaces 
- [x] Prisma Schemas (Organization, Workspace, WorkspaceMember)
- [x] Organization CRUD API (`/api/organizations`)
- [x] Workspace CRUD API (`/api/organizations/:orgId/workspaces`)
- [x] Workspace Members API
- [ ] Enforcing Role-based Access Control (OWNER, ADMIN, MEMBER, VIEWER)
- [ ] Invitations & Onboarding

### Phase 3: Real-Time Chat
- [ ] WebSockets Setup (Socket.io)
- [ ] Direct Messaging
- [ ] Workspace/Channel Messaging
- [ ] Message History & Pagination

### Phase 4: AI Integration
- [ ] AI Agent setup
- [ ] Contextual awareness within workspaces
- [ ] Conversational AI endpoints

## 📝 Key Design Decisions
- **Port:** Backend runs on `5001` (to avoid macOS AirPlay conflict on 5000).
- **Prisma:** Explicitly using Prisma v6 to avoid bleeding-edge adapter complexities of v7.
- **Sessions:** Will use a database-backed `Session` model to robustly handle token invalidation for `logout` and `logout-all` features.
