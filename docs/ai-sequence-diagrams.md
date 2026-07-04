# AI Sequence Diagrams

This document contains sequence flows for the primary AI functionalities.

## 1. AI Caching Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Server as AI Gateway
    participant Cache as AICache
    participant LLM as Model Gateway

    Server->>Server: Compute SHA256 Hash of prompt & context state
    Server->>Cache: Query cache by Hash & WorkspaceID
    
    alt Cache Hit
        Cache-->>Server: Return cached response text
        Server-->>Client: Send response (Skipped LLM API Call)
    else Cache Miss
        Cache-->>Server: No result / Expired
        Server->>LLM: streamPrompt(...)
        LLM-->>Server: Return generated response text
        Server->>Cache: Insert new cache row (TTL 5 mins)
        Server-->>Client: Send response
    end
```

---

## 2. Asynchronous AI Job Worker Sequence

This diagram maps how heavy summaries (e.g. Daily Workspace Summaries) are queued and processed.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Cron Trigger (9 AM)
    participant DB as Prisma Database
    participant Server as Express Server
    participant Queue as AI Job Queue
    participant Worker as AI Worker
    participant LLM as Model Gateway

    Cron->>Server: HTTP POST /api/workspaces/:id/jobs (System Trigger)
    Server->>DB: Insert AIJob { status: PENDING, type: DAILY_SUMMARY }
    Server->>Queue: Push Job UUID
    Server-->>Cron: HTTP 202 Accepted
    
    rect rgb(240, 240, 240)
        note over Worker: Asynchronous Processing
        Queue-->>Worker: Dequeue Job UUID
        Worker->>DB: Update AIJob status to PROCESSING
        Worker->>DB: Fetch yesterday's messages, tasks, and memory
        DB-->>Worker: Return context data
        Worker->>LLM: queryLLMWithContext(summary_prompt, context)
        LLM-->>Worker: Return generated summary text
        Worker->>DB: Save summary to WorkspaceKnowledge / Update AIJob to COMPLETED
        Worker->>Server: Trigger channel broadcast via Socket.io
    end
```
