# Task Management ER Diagram

This document describes the database design for the task management, labels, comments, sprints, attachments, and activity history modules.

---

## 📊 ER Diagram

```mermaid
erDiagram
    Workspace ||--o{ Task : contains
    Workspace ||--o{ Label : owns
    Workspace ||--o{ Sprint : schedules
    
    User ||--o{ Task : creates
    User ||--o{ Task : assigns
    
    Task ||--o{ TaskComment : receives
    Task ||--o{ TaskAttachment : has
    Task ||--o{ TaskActivity : records
    
    Task ||--o{ TaskLabel : categorized-by
    Label ||--o{ TaskLabel : categorizes
    
    Sprint ||--o{ SprintTask : schedules
    Task ||--o{ SprintTask : scheduled-in

    User ||--o{ TaskComment : writes
    User ||--o{ TaskAttachment : uploads
    User ||--o{ TaskActivity : acts

    Task {
        string id PK
        string workspaceId FK
        string title
        string description
        string status "TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED | CANCELLED"
        string priority "LOW | MEDIUM | HIGH | URGENT"
        string type "TASK | BUG | FEATURE | EPIC | STORY | SUBTASK"
        string createdBy FK "User ID"
        string assignedTo FK "User ID, Nullable"
        datetime startDate "Nullable"
        datetime dueDate "Nullable"
        datetime completedAt "Nullable"
        float estimatedHours "Nullable"
        float actualHours "Nullable"
        float position "For Kanban board sorting"
        datetime createdAt
        datetime updatedAt
    }

    TaskComment {
        string id PK
        string taskId FK
        string authorId FK
        string content
        datetime editedAt "Nullable"
        datetime createdAt
    }

    Label {
        string id PK
        string workspaceId FK
        string name
        string color "Hex code"
    }

    TaskLabel {
        string taskId PK, FK
        string labelId PK, FK
    }

    TaskAttachment {
        string id PK
        string taskId FK
        string fileUrl
        string fileName
        string mimeType
        int fileSize
        string uploadedBy FK "User ID"
        datetime createdAt
    }

    TaskActivity {
        string id PK
        string taskId FK
        string actorId FK
        string action "field name or action string"
        string oldValue "Nullable"
        string newValue "Nullable"
        datetime createdAt
    }

    Sprint {
        string id PK
        string workspaceId FK
        string name
        string goal
        datetime startDate
        datetime endDate
        string status "PLANNED | ACTIVE | COMPLETED"
    }

    SprintTask {
        string sprintId PK, FK
        string taskId PK, FK
    }
```

---

## 🗄️ Database Design Highlights

1. **Kanban Ordering (`position`)**:
   - The `position` column uses a floating point number. This allows inserting tasks anywhere on the board (e.g., between position `1.0` and `2.0` by assigning `1.5`) without re-indexing other tasks, enabling high-performance drag-and-drop operations.

2. **Audit & Transparency (`TaskActivity`)**:
   - Every state transition, priority change, and assignee update generates a `TaskActivity` record. This creates an audit log that powers Jira-style activity feeds on the task detail pages.

3. **Many-to-Many Mappings**:
   - `TaskLabel` and `SprintTask` are explicit join tables. This guarantees indexing efficiency and simple migration logic, matching MySQL-specific indexes for fast queries.
