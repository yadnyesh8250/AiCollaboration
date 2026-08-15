# Phase G2: Workspace Home Information Architecture Refactor Report

This report documents the architectural improvements implemented during **Phase G2** to redesign the Workspace Home Dashboard and build a real-time, data-backed collaboration entry page in **A-Collab**.

---

## 1. React Query as the Single Source of Truth
To prevent UI desynchronization and stale state display, all workspace data is managed via **TanStack Query (React Query)** caches instead of raw component state:
- **Tasks List**: Loaded via `["workspaceTasks", workspaceId]` to calculate incomplete user tasks and upcoming deadlines.
- **Sprints**: Loaded via `["workspaceSprints", workspaceId]` to resolve active sprint duration and task list associations.
- **Unread Metrics**: Loaded via `["workspaceDashboard", workspaceId]` to track unread message statistics.
- **In-App Notifications**: Loaded via `["notifications"]` to monitor unread system alerts.

All mutations (e.g. creating tasks or documents) trigger explicit query cache invalidations to update server-confirmed values instantly.

---

## 2. Real-Time Workspace Synchronization (Socket.io)
We wired Socket.io event list invalidation blocks inside the homepage controller hook:
- **Task updates**: `taskCreated`, `taskUpdated`, and `taskDeleted` events invalidate `workspaceTasks` and `workspaceDashboard`.
- **Sprint updates**: `sprintCreated` and `sprintUpdated` events invalidate `workspaceSprints`.
- **Document updates**: `documentCreated`, `documentUpdated`, and `documentDeleted` events invalidate `workspaceDocsList` and `workspaceDashboard`.
- **System updates**: `notification:new` invalidates `notifications`.
- **Member updates**: `memberAdded` and `memberRemoved` events invalidate `workspaceMembers`.

This ensures that whenever any user does work in the workspace, the dashboard metrics on other connected browsers update instantly without requiring a page reload.

---

## 3. Truthful Recent Activity Logging
To maintain authentic activity histories, the dashboard no longer manufactures fake user stories or hardcoded actions (e.g., *"Alex updated X"*).
- Retrieves the active workspace tasks and documents, merges them, and sorts the combined list by `updatedAt` descending.
- Formats each item using its actual resource type, database title, and a computed relative timestamp (e.g., *"Authentication API (Task) — Updated 8m ago"*).

---

## 4. Zustand-based CollabAI Prompts System
Unified the prompt query trigger model using the existing Zustand store rather than brittle window DOM event dispatchers:
- **uiStore State**: Added `copilotPrompt` variable and actions `openCopilot(prompt)` and `clearCopilotPrompt()`.
- **Trigger**: Clicking any suggested prompt card on the Home page calls `openCopilot(prompt)`, which sets the active panel to `"AI_COPILOT"` and caches the prompt string.
- **Copilot Drawer**: `RightDrawer.jsx` watches `copilotPrompt` via a React effect, immediately dispatches the prompt query to the backend Gemini AI conversation endpoint, and clears the Zustand prompt cache.

---

## 5. Visual Hierarchy & Quick Actions
Replaced the cluttered SaaS landing elements with a simplified layout built on clean borders and whitespace:
- **Good Morning Header**: Contextual greeting matching local time + user's first name.
- **My Work**: Focus grid listing user-assigned tasks sorted by due dates, showing indicators for items due today.
- **Current Sprint**: Progress card calculating task completion ratios and displaying active sprint status.
- **Recent Workspace Activity**: Live combined activity feed.
- **CollabAI assistant**: Diagnostic overview listing blocked tasks, upcoming due items, and suggested prompt buttons.
- **Quick Actions Row**: Grounded bottom action bar: `[New Task]`, `[New Document]`, `[Invite Teammate]`, and `[Ask CollabAI]`.

---

## 6. Verification Results
- **Production Build compilation**: Vite compiles cleanly with **0 errors**:
  ```bash
  npm run build
  ✓ built in 344ms
  ```
- **Gemini Assistant integration**: Suggested prompts execute correctly, showing appropriate thinking/loading indicators and returning actual backend LLM workspace feedback.
- **Real-time collaboration**: Socket triggers successfully refresh target query groups instantly on multi-browser workspace views.
