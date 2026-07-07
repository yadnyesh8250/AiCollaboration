# Kanban Board Flow & Positional Updates

This document describes how A-Collab manages drag-and-drop Kanban updates, calculates positions for ordering, handles floating point re-spacing, and broadcasts changes in real time.

---

## 🔄 Status State Machine

```
              ┌──────────────┐
              │     TODO     │
              └──────┬───────┘
                     │
             ┌───────▼───────┐
             │  IN_PROGRESS  │
             └───────┬───────┘
                     │
             ┌───────▼───────┐
             │   IN_REVIEW   │
             └───────┬───────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
  ┌──────────┐                ┌──────────┐
  │   DONE   │                │ BLOCKED  │
  └──────────┘                └──────────┘
```
- A task can be moved to any status column based on workspace needs.
- Setting status to `DONE` automatically registers `completedAt = now()`. Setting it back clears `completedAt`.

---

## 📐 Fractional Positioning Algorithm

To avoid expensive $O(N)$ database updates (updating every task's index in a list when one changes), A-Collab uses **Fractional Position Indexing** (Float-based position columns).

```
   Existing Task A            (New Task C inserted)            Existing Task B
  Position: 1000.0 ──────────────► Position: 1500.0 ──────────────► Position: 2000.0
```

### Calculation Rules
When a task is moved to a target column:

1. **Insert in Middle (Between Task A and Task B):**
   $$P_{\text{new}} = \frac{P_A + P_B}{2}$$

2. **Insert at Top (Before the first task A):**
   $$P_{\text{new}} = \frac{P_A}{2}$$
   *(If column is empty, default position is $1000.0$).*

3. **Insert at Bottom (After the last task B):**
   $$P_{\text{new}} = P_B + 1000.0$$

### 🛠️ Floating Point Collision & Re-spacing
If tasks are repeatedly dragged to the same position, the float gap might shrink below safe limits ($P_{\text{next}} - P_{\text{prev}} < 0.00001$).
- **Trigger:** When the difference is less than $10^{-5}$, the backend triggers a background task.
- **Action:** Fetches all tasks in that specific status column, sorts them by position, and re-spaces them at $1000.0$, $2000.0$, $3000.0$, etc.

---

## ⚡ Real-Time Socket Flow

When a client drags a card and updates status/position:

```
[ Client A ] ───(PATCH /tasks/:id/status)───► [ Express Server ] ───(Save to DB)
     │                                               │
     │                                       [ Emits taskUpdated ]
     │                                               │
     │                                               ▼
[ Client B ] ◄───(Receives WebSocket Event)─── [ socket.to('workspace:id') ]
(Renders card in new column/index instantly)
```

### Event Schema: `taskUpdated`
Broadcasted to `workspace:${workspaceId}`:
```json
{
  "event": "taskUpdated",
  "data": {
    "taskId": "task-uuid-456",
    "workspaceId": "workspace-uuid-111",
    "status": "IN_PROGRESS",
    "position": 1500.0,
    "assignedTo": "user-uuid-123",
    "updatedBy": "user-uuid-888"
  }
}
```
All users connected to the workspace room receive the update and their client UI automatically animates the card to its new position.
