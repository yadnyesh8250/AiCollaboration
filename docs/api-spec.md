# A-Collab Productivity Engine API Specification

All endpoints are prefixed with `/api` and require a JSON Web Token in the authorization header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 📋 Task Management APIs

### 1. Create Task
- **Method:** `POST`
- **URL:** `/workspaces/:workspaceId/tasks`
- **Body (JSON):**
  ```json
  {
    "title": "Build Auth Controller",
    "description": "Implement authentication endpoints.",
    "status": "TODO",
    "priority": "HIGH",
    "type": "TASK",
    "assignedTo": "user-uuid-123",
    "startDate": "2026-07-08T00:00:00.000Z",
    "dueDate": "2026-07-15T00:00:00.000Z",
    "estimatedHours": 6.5,
    "position": 1000.0
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": "task-uuid-456", "title": "Build Auth Controller", "status": "TODO", ... }
  }
  ```

### 2. List Workspace Tasks
- **Method:** `GET`
- **URL:** `/workspaces/:workspaceId/tasks`
- **Query Params:** `status`, `priority`, `type`, `assignedTo`, `sprintId`, `search` (optional filters)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [ { "id": "task-uuid-456", "title": "Build Auth Controller", ... } ]
  }
  ```

### 3. Get Task Details
- **Method:** `GET`
- **URL:** `/tasks/:taskId`
- **Response (200 OK):** Includes comments, attachments, labels, and sprint details.

### 4. Patch Task
- **Method:** `PATCH`
- **URL:** `/tasks/:taskId`
- **Body (JSON):** Any field from task creation.
- **Response (200 OK):** Returns updated task. Generates automatic `TaskActivity`.

### 5. Delete Task
- **Method:** `DELETE`
- **URL:** `/tasks/:taskId`
- **Response (200 OK):** `{ "success": true, "message": "Task deleted successfully" }`

---

## 💬 Task Comment APIs

### 1. Add Comment
- **Method:** `POST`
- **URL:** `/tasks/:taskId/comments`
- **Body (JSON):** `{ "content": "Let's use Argon2 for security." }`
- **Response (201 Created):** `{ "success": true, "data": { "id": "comment-1", "content": "..." } }`

### 2. Get Comments
- **Method:** `GET`
- **URL:** `/tasks/:taskId/comments`

### 3. Delete Comment
- **Method:** `DELETE`
- **URL:** `/comments/:commentId`

---

## 🏷️ Task Label APIs

### 1. Create Label
- **Method:** `POST`
- **URL:** `/workspaces/:workspaceId/labels`
- **Body:** `{ "name": "Backend", "color": "#FF0000" }`

### 2. Add Label to Task
- **Method:** `POST`
- **URL:** `/tasks/:taskId/labels`
- **Body:** `{ "labelId": "label-uuid-999" }`

---

## 📂 Task Attachment APIs

### 1. Upload Attachment
- **Method:** `POST`
- **URL:** `/tasks/:taskId/attachments`
- **Content-Type:** `multipart/form-data`
- **Body:** File input with key `file`
- **Response (201 Created):** `{ "success": true, "data": { "id": "attach-1", "fileUrl": "/uploads/..." } }`

---

## 🔄 Kanban Board Updates

### 1. Drag & Drop Reordering
- **Method:** `PATCH`
- **URL:** `/tasks/:taskId/status`
- **Body (JSON):**
  ```json
  {
    "status": "IN_PROGRESS",
    "position": 1500.0
  }
  ```
- **Response (200 OK):** Updates the position/status. Emits `taskUpdated` via Socket.io to workspace room.

---

## 🏃 Sprint System APIs

### 1. Create Sprint
- **Method:** `POST`
- **URL:** `/workspaces/:workspaceId/sprints`
- **Body:** `{ "name": "Sprint 1", "goal": "Deliver MVP", "startDate": "...", "endDate": "..." }`

### 2. Update Sprint Status (Start/Complete)
- **Method:** `PATCH`
- **URL:** `/sprints/:sprintId`
- **Body:** `{ "status": "ACTIVE" }` or `{ "status": "COMPLETED" }`
- *Note:* Completing a sprint automatically shifts unfinished tasks back to the backlog or next sprint.

---

## 📄 Document (Notion-Style) APIs

### 1. Create Document
- **Method:** `POST`
- **URL:** `/workspaces/:workspaceId/documents`
- **Body:** `{ "title": "System Architecture", "parentDocumentId": null, "visibility": "WORKSPACE" }`

### 2. Update Page Structure (Blocks)
- **Method:** `PUT`
- **URL:** `/documents/:documentId/blocks`
- **Body (JSON):**
  ```json
  {
    "blocks": [
      { "id": "block-1", "type": "HEADING", "content": "Tech Stack", "position": 1.0 },
      { "id": "block-2", "type": "PARAGRAPH", "content": "React and Node.js", "position": 2.0 }
    ]
  }
  ```

### 3. Create Version Snapshot
- **Method:** `POST`
- **URL:** `/documents/:documentId/versions`
- **Response (201):** Creates version history snapshot.

### 4. Restore Version
- **Method:** `POST`
- **URL:** `/documents/:documentId/versions/:versionId/restore`

### 5. Update Permission
- **Method:** `POST`
- **URL:** `/documents/:documentId/permissions`
- **Body:** `{ "userId": "user-123", "role": "EDITOR" }`

---

## 🤖 AI Features

### 1. Generate Tasks via AI
- **Method:** `POST`
- **URL:** `/workspaces/:workspaceId/ai/task-generate`
- **Body:** `{ "prompt": "Create a sprint plan for launching the auth system" }`
- **Response (201):** Creates structured tasks and subtasks using Gemini.

### 2. Summarize Page via AI
- **Method:** `POST`
- **URL:** `/documents/:documentId/ai/summarize`
- **Response (200):** Returns paragraph summary of all blocks.

---

## 🔍 Global Search & Analytics

### 1. Global Search
- **Method:** `GET`
- **URL:** `/search`
- **Query:** `?q=authentication&workspaceId=...`
- **Response (200):** Matches tasks, documents, and message files.

### 2. Workspace Dashboard
- **Method:** `GET`
- **URL:** `/workspaces/:workspaceId/dashboard`
- **Response (200):** Counts open, completed, blocked tasks, recent docs, deadlines, and notifications.
