# RAG Context Retrieval, Ranking & Planning Design

The Context Engine compiles and filters workspace history to inject into the LLM system prompt. 

## 🧠 The AI Planner Loop
When a query requires complex reasoning (e.g. "Check if the auth API is delayed and notify Rahul"), the **Agent Router** initializes the **AI Planner** rather than querying context directly:

```
                      User Prompt: "Check progress of auth API"
                                      │
                                      ▼
                             [ AI Planner Loop ]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
         [ Action 1: Search Tasks ]                 [ Action 2: Retrieve Memory ]
         - Queries tasks matching "auth"            - Fetch technical goals
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                       [ Synthesizes Results ]
               AI analyzes: Task "Auth API" is overdue.
                                      │
                                      ▼
                        [ Action 3: Execute Tool ]
               Invokes assignee notification pipeline.
```

---

## ⚡ The AI Caching Layer

To optimize response speeds and minimize API token billing, A-Collab intercepts LLM calls using a high-speed caching layer (backed by Redis or an indexed database table):

1. **Hash Generation:** The system hashes the user prompt + active workspace config metadata + channel context state:
   $$\text{Query Hash} = \text{SHA256}(\text{Prompt} + \text{Channel ID} + \text{Last Message ID})$$
2. **Cache Lookup:** Searches the `AICache` table.
3. **Cache Hit:** If found and `expiresAt` is in the future, the system directly returns the cached output.
4. **Cache Miss:** Queries the Model Gateway, saves the response to `AICache` with a Time-To-Live (TTL) of 5 minutes (or 2 hours for static summaries), and returns it to the client.

---

## 🏆 Context Ranking Weights

```
        ┌───────────────────┬─────────┴─────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼
  1. Knowledge Base     2. Memory        3. Tasks Info        4. Messages
   (Score: 1.0)        (Score: 0.8)       (Score: 0.6)        (Score: 0.4)
```
1. **Priority 1: Workspace Knowledge Base (Score 1.0)** - Deployment guides, standards.
2. **Priority 2: Workspace Memory (Score 0.8)** - Current sprint variables.
3. **Priority 3: Workspace Tasks (Score 0.6)** - Active workspace tasks.
4. **Priority 4: Channel Message Log (Score 0.4)** - Recent channel history.
