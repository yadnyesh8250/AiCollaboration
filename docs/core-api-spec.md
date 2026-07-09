# A-Collab Core REST API & WebSocket Specification

This specification documents the endpoints, payload formats, authentication mechanics, and WebSocket protocols for A-Collab's core modules: Identity & Session Management (Phase 1), Organization & Workspace Administration (Phase 2), and Real-time Communication & Socket Rooms (Phase 3).

All REST requests must be prefixed with `/api` and require a JSON Web Token in the authorization header (except where specified as public):
`Authorization: Bearer <JWT_TOKEN>`

---

## 🔒 1. Identity & Session APIs (Phase 1)

### User Register
* **Method:** `POST`
* **URL:** `/auth/register` (Public, Rate-Limited)
* **Body:**
  ```json
  {
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "user": {
      "id": "u-uuid-111",
      "email": "user@example.com",
      "username": "johndoe",
      "status": "OFFLINE"
    }
  }
  ```

### User Login
* **Method:** `POST`
* **URL:** `/auth/login` (Public, Rate-Limited)
* **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhcG...",
    "user": {
      "id": "u-uuid-111",
      "username": "johndoe"
    }
  }
  ```

### Token Refresh
* **Method:** `POST`
* **URL:** `/auth/refresh` (Public, Rate-Limited)
* **Body:**
  ```json
  {
    "refreshToken": "eyJhcG..."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "accessToken": "eyJhbG_NEW...",
    "refreshToken": "eyJhcG_NEW..."
  }
  ```

### User Logout
* **Method:** `POST`
* **URL:** `/auth/logout` (Public)
* **Body:**
  ```json
  {
    "refreshToken": "eyJhcG..."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### Get My Profile
* **Method:** `GET`
* **URL:** `/auth/me` (Protected)
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "u-uuid-111",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "bio": "Software Engineer",
      "avatarUrl": "/uploads/avatar.png"
    }
  }
  ```

### Update User Profile
* **Method:** `PATCH`
* **URL:** `/users/profile` (Protected)
* **Body:**
  ```json
  {
    "firstName": "Jonathan",
    "bio": "Updated developer bio",
    "avatarUrl": "https://cdn.com/avatar.jpg"
  }
  ```
* **Response (200 OK):** Returns updated user profile.

---

## 🏢 2. Organization & Workspace APIs (Phase 2)

### Create Organization
* **Method:** `POST`
* **URL:** `/organizations` (Protected)
* **Body:**
  ```json
  {
    "name": "Acme Corp",
    "slug": "acme-corp",
    "description": "Global enterprise account"
  }
  ```
* **Response (201 Created):** Returns organization details. Creator is assigned `OWNER` role inside the organization.

### Create Workspace
* **Method:** `POST`
* **URL:** `/organizations/:orgId/workspaces` (Protected, requires Org OWNER/ADMIN)
* **Body:**
  ```json
  {
    "name": "Engineering Team",
    "slug": "engineering",
    "description": "Primary workspace for engineering task management",
    "isPublic": false
  }
  ```
* **Response (201 Created):** Returns workspace details.

### Workspace Role-Based Access Control (RBAC)
Workspace endpoints enforce role-based access validation. Available roles are: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.

* **Modify Workspace:** `PUT /api/workspaces/:workspaceId` (Requires OWNER/ADMIN)
* **Delete Workspace:** `DELETE /api/workspaces/:workspaceId` (Requires OWNER)
* **Add Member:** `POST /api/workspaces/:workspaceId/members` (Requires OWNER/ADMIN)
* **Remove Member:** `DELETE /api/workspaces/:workspaceId/members/:memberId` (Requires OWNER/ADMIN)
* **Update Member Role:** `PATCH /api/workspaces/:workspaceId/members/:memberId`
  * **Body:** `{ "role": "ADMIN" }`

### Invite User to Workspace
* **Method:** `POST`
* **URL:** `/invites/:workspaceId` (Protected, requires Workspace OWNER/ADMIN)
* **Body:**
  ```json
  {
    "email": "newuser@example.com",
    "role": "MEMBER"
  }
  ```
* **Response (201 Created):** Generates an invitation token and records it in `WorkspaceInvite` table.

### Accept Workspace Invitation
* **Method:** `POST`
* **URL:** `/invites/accept` (Protected)
* **Body:**
  ```json
  {
    "token": "invitation-token-uuid-123"
  }
  ```
* **Response (200 OK):** Registers user to the workspace members table.

---

## 💬 3. Real-Time Chat & Messages (Phase 3)

### Create Channel
* **Method:** `POST`
* **URL:** `/workspaces/:workspaceId/channels` (Protected, Workspace OWNER/ADMIN/MEMBER)
* **Body:**
  ```json
  {
    "name": "Dev Ops Discussions",
    "slug": "devops",
    "description": "Infrastructure updates & automation pipelines",
    "type": "PUBLIC" // Enum: PUBLIC, PRIVATE, ANNOUNCEMENT, AI
  }
  ```
* **Response (201 Created):** Returns channel object. Emits `channelCreated` to workspace room.

### Send Message
* **Method:** `POST`
* **URL:** `/channels/:channelId/messages` (Protected)
* **Body:**
  ```json
  {
    "content": "Make sure to push all commits to main. @johndoe",
    "messageType": "TEXT", // Enum: TEXT, IMAGE, VIDEO, FILE, SYSTEM, AI
    "parentMessageId": null // Populate for threaded reply
  }
  ```
* **Response (201 Created):** Returns full message object. Automatically extracts mentions and triggers notifications. Emits `receiveMessage` to channel room.

### List Messages (Cursor Pagination)
* **Method:** `GET`
* **URL:** `/channels/:channelId/messages`
* **Query Params:** `limit=30`, `cursor=message-uuid-timestamp`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": "m-1", "content": "Hello", "createdAt": "..." }
    ],
    "nextCursor": "m-1-timestamp" // Null if end of history
  }
  ```

### Message Reactions
* **Add Emoji Reaction:** `POST /api/messages/:messageId/reactions`
  * **Body:** `{ "emoji": "🔥" }`
* **Remove Emoji Reaction:** `DELETE /api/messages/:messageId/reactions`
  * **Body:** `{ "emoji": "🔥" }`

### Message Attachments
* **Upload Message Attachment:** `POST /api/messages/:messageId/attachments`
  * **Content-Type:** `multipart/form-data`
  * **Form Field:** `file` (Binary attachment file)
* **Delete Attachment:** `DELETE /api/attachments/:id`

---

## 🔌 4. WebSocket Event Specification

A-Collab utilizes Socket.io to manage real-time updates. If Redis is online, events are replicated across multiple backend instances via the `@socket.io/redis-adapter` for horizontal scaling.

### Client Authentication (Handshake)
Clients must pass their JWT Access Token in the auth metadata object during connection initialization:
```javascript
const socket = io("http://localhost:5001", {
  auth: {
    token: "eyJhbGc..."
  }
});
```

### Room Structures
Clients join rooms to restrict broadcast noise to relevant scopes:
1. `workspace:${workspaceId}`: Scope for workspace level events (sprints, tasks, docs, status changes, presence).
2. `channel:${channelId}`: Scope for real-time conversation actions (chat message, reactions, typing).

### Client-to-Server Events
The client triggers these events to synchronize status or join rooms:

| Event Name | Parameter Schema | Description |
| :--- | :--- | :--- |
| `joinWorkspace` | `workspaceId` (String) | Joins the room for workspace administrative updates. |
| `leaveWorkspace` | `workspaceId` (String) | Leaves workspace updates. |
| `joinChannel` | `channelId` (String) | Joins channel messages room. |
| `leaveChannel` | `channelId` (String) | Leaves channel room. |
| `typing` | `{ channelId: string }` | Sends active typing indicator to other channel members. |
| `stopTyping` | `{ channelId: string }` | Clears typing state. |

### Server-to-Client Broadcast Events
Broadcasted by the server to active rooms.

#### 1. Presence Indicators (`workspace:${workspaceId}`)
* `userOnline`: `{ userId: string }` - Emitted when a member connects.
* `userOffline`: `{ userId: string }` - Emitted when a member disconnects.

#### 2. Chat Communications (`channel:${channelId}`)
* `receiveMessage`: Emitted on new messages.
  ```json
  {
    "id": "message-uuid",
    "content": "Hello world",
    "channelId": "...",
    "sender": { "id": "...", "username": "..." },
    "createdAt": "..."
  }
  ```
* `editMessage`: Emitted when messages are revised.
* `deleteMessage`: `{ messageId: string, channelId: string }` - Emitted on deletion.
* `reactionAdded` / `reactionRemoved`: Emits emoji changes.
* `attachmentAdded` / `attachmentRemoved`: Updates file references.
* `typing` / `stopTyping`: `{ userId: string, channelId: string }`
* `messageRead`: `{ messageId: string, userId: string, readAt: DateTime }`

#### 3. Task Management (`workspace:${workspaceId}`)
* `taskCreated`: Emitted on task creation.
* `taskUpdated`: Emits full task updates (Kanban drag-and-drop actions).
* `taskDeleted`: `{ taskId: string }`
* `taskCommentCreated` / `taskCommentUpdated` / `taskCommentDeleted`: Tracks comment updates.
* `taskAttachmentAdded` / `taskAttachmentRemoved`: Tracks attachment updates.
* `taskLabelAdded` / `taskLabelRemoved`: Tracks label changes.
* `taskSprintAdded` / `taskSprintRemoved`: Tracks sprint association.

#### 4. Sprints & Documents (`workspace:${workspaceId}`)
* `sprintCreated` / `sprintUpdated`: Notifies client of active sprint goals.
* `documentCreated` / `documentUpdated` / `documentDeleted`: Notifies page changes.
* `documentBlocksUpdated`: `{ documentId: string, blocks: DocumentBlock[] }` - Emitted during collaborative block re-ordering or structural edits.
* `documentCommentCreated`: Emitted when a page inline comment is added.
