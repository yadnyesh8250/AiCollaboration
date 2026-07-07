# Global Search Architecture

This document describes the design of A-Collab's global search engine, which provides unified searching across Tasks, Documents, Messages, Channels, RAG Knowledge, and Users.

---

## 🔍 Search Architecture Flow

```
                      Client Query: "GET /api/search?q=auth"
                                       │
                                       ▼
                       [ Concurrent DB Queries ]
             ┌─────────────────────────┼─────────────────────────┐
             ▼                         ▼                         ▼
      [ Search Tasks ]         [ Search Documents ]     [ Search Messages ]
   (title & description)       (title & block content)       (content log)
             │                         │                         │
             └─────────────────────────┼─────────────────────────┘
                                       │
                                       ▼
                            [ Aggregate & Rank ]
                       Calculates match scoring weight
                                       │
                                       ▼
                           [ Paginated Response ]
                       Returns categorized result cards
```

---

## 🗄️ Database Query Strategy

Since we use MySQL with Prisma, we can leverage MySQL Full-Text Search (FTS) indexes or use advanced Prisma `contains` query conditions. To ensure compatibility and ease of deployment on local MySQL instances, A-Collab uses a hybrid approach:

1. **Full-Text Indexing (Optional/Advanced):**
   - For high performance, we define standard MySQL `FULLTEXT` indexes on text-heavy fields:
     - `Task(title, description)`
     - `Message(content)`
     - `DocumentBlock(content)`
     - `WorkspaceKnowledge(title, content)`

2. **Querying Concurrent Channels:**
   To guarantee sub-100ms response times, we execute queries in parallel using `Promise.all` inside the search service:
   ```javascript
   const [tasks, documents, messages, channels, knowledge, users] = await Promise.all([
     searchTasks(query, workspaceId),
     searchDocuments(query, workspaceId),
     searchMessages(query, workspaceId),
     searchChannels(query, workspaceId),
     searchKnowledge(query, workspaceId),
     searchUsers(query, workspaceId)
   ]);
   ```

---

## 🏆 Scoring & Ranking Heuristics

To show the most relevant items first, results are ranked by match proximity and entity priority:

| Entity Type | Field Matched | Weight Multiplier |
| :--- | :--- | :--- |
| **Workspace Knowledge** | Title / Content | `1.0` |
| **Document** | Title | `0.9` |
| **Task** | Title | `0.8` |
| **Channel** | Name | `0.7` |
| **DocumentBlock** | Block Content | `0.6` |
| **Task** | Description | `0.5` |
| **Message** | Message Content | `0.4` |

### Formatting the Unified JSON Response
```json
{
  "success": true,
  "query": "auth",
  "totalResults": 42,
  "results": {
    "tasks": [
      { "id": "t-1", "title": "Implement Auth Middleware", "score": 0.8 }
    ],
    "documents": [
      { "id": "d-1", "title": "Auth Specifications", "score": 0.9 }
    ],
    "messages": [
      { "id": "m-1", "content": "Did you fix the auth token bug?", "sender": "Rahul", "score": 0.4 }
    ],
    "channels": [],
    "knowledge": [],
    "users": []
  }
}
```
This structure makes it extremely simple for the frontend to render categorized search results tabs or a unified preview.
