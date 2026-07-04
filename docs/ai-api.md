# AI API Specification

This document details the REST endpoints and WebSocket events for the Enterprise AI Collaboration Module.

## 📡 REST Endpoints

### 1. AI Conversations & Branching

#### `POST /api/workspaces/:workspaceId/ai/conversations`
Creates a new AI conversation tree.

#### `POST /api/ai/conversations/:conversationId/messages`
Send a prompt to the conversation tree (supports branching with `parentId`).

---

### 2. AI Config & Persona

#### `PATCH /api/workspaces/:workspaceId/ai/config`
Update workspace-specific LLM parameters (Requires Workspace OWNER/ADMIN).
- **Request Body:**
  ```json
  {
    "preferredModel": "gemini-2.5-flash",
    "temperature": 0.5,
    "maxTokens": 1000
  }
  ```

#### `PATCH /api/workspaces/:workspaceId/ai/persona`
Update Assistant Persona configuration (Requires Workspace OWNER/ADMIN).
- **Request Body:**
  ```json
  {
    "name": "DevBot",
    "behavior": "TECHNICAL"
  }
  ```

---

### 3. AI Analytics Dashboard

#### `GET /api/workspaces/:workspaceId/ai/analytics`
Fetch cost and usage analytics for workspace admins (Requires Workspace OWNER/ADMIN).
- **Response:**
  ```json
  {
    "success": true,
    "analytics": {
      "totalSpendUsd": 12.45,
      "totalTokens": 845000,
      "mostUsedAgent": "TASK_AGENT",
      "mostActiveUser": "john-uuid",
      "averageLatencyMs": 850
    }
  }
  ```

---

### 4. AI Background Workers & Jobs

#### `POST /api/workspaces/:workspaceId/ai/jobs`
Queue a background worker job (e.g. bulk summarizations, sprint checkups).
- **Request Body:**
  ```json
  {
    "jobType": "DAILY_SUMMARY",
    "runAt": "2026-07-05T09:00:00Z"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "job": {
      "id": "job-uuid",
      "status": "PENDING",
      "jobType": "DAILY_SUMMARY",
      "runAt": "2026-07-05T09:00:00Z"
    }
  }
  ```

---

## 🔌 WebSocket Events & Streaming (Real-time AI Chat)

### `@ai` Mentions & Persona Integration
When a user mentions `@ai`, the backend:
1. Loads the `WorkspaceAIPersona` and `WorkspaceAIConfig`.
2. Tailors the System Instructions (e.g., "You are DevBot, a technical assistant").
3. Fetches the ranked RAG context.
4. Checks the `AICache` to see if a matching request exists.
5. Streams the output chunk-by-chunk via socket emits (`aiMessageChunk` and `aiMessageComplete`).
