# Document System ER Diagram

This document defines the database design for the Notion-style collaborative Document System, content blocks, versions, page comments, and permissions.

---

## 📊 ER Diagram

```mermaid
erDiagram
    Workspace ||--o{ Document : contains
    User ||--o{ Document : creates
    
    Document ||--o{ DocumentBlock : contains
    Document ||--o{ DocumentVersion : saves
    Document ||--o{ DocumentComment : discusses
    Document ||--o{ DocumentPermission : regulates
    
    Document ||--o{ Document : parent-to "Nested Hierarchy (parentDocumentId)"
    
    User ||--o{ DocumentVersion : edits
    User ||--o{ DocumentComment : writes
    User ||--o{ DocumentPermission : granted

    Document {
        string id PK
        string workspaceId FK
        string title
        string slug "URL-friendly string unique within workspace"
        string icon "Emoji / Icon string, Nullable"
        string coverImage "URL, Nullable"
        string createdBy FK "User ID"
        string parentDocumentId FK "Self-referential, Nullable"
        string visibility "PUBLIC | WORKSPACE | PRIVATE"
        datetime createdAt
        datetime updatedAt
    }

    DocumentBlock {
        string id PK
        string documentId FK
        string type "HEADING | PARAGRAPH | CHECKLIST | CODE | QUOTE | TABLE | IMAGE | DIVIDER"
        string content "Text content or JSON for structures like tables/checklists"
        float position "For sorting blocks on page"
        datetime createdAt
        datetime updatedAt
    }

    DocumentVersion {
        string id PK
        string documentId FK
        int version "Incremental version counter"
        string content "Full snapshotted JSON structure of blocks"
        string editedBy FK "User ID"
        datetime createdAt
    }

    DocumentComment {
        string id PK
        string documentId FK
        string authorId FK
        string content
        datetime createdAt
    }

    DocumentPermission {
        string id PK
        string documentId FK
        string userId FK
        string role "OWNER | EDITOR | COMMENTER | VIEWER"
    }
```

---

## 🗄️ Database Design Highlights

1. **Document Hierarchy (Self-Relation)**:
   - The `parentDocumentId` field references the `Document` table itself. This enables unlimited nesting of pages (sub-pages, folders, books), matching Notion's structure.

2. **Block-Based Content System**:
   - Rather than storing content as a single blob of HTML or Markdown, pages are split into individual `DocumentBlock` records. This allows granular page edits, real-time block-level locking, search indexing of specific blocks, and makes the system future-proof for rich interactive components (e.g. embed cards, Kanban-in-doc, etc.).

3. **Incremental Versioning**:
   - The `DocumentVersion` table maintains full snapshot states. Every major revision saves the entire state along with the user ID who saved it, enabling detailed diffs and full document restore capabilities.

4. **Document Permissions (Access Control List)**:
   - Overrides default workspace member roles with granular document-level sharing. It specifies permissions (`OWNER`, `EDITOR`, `COMMENTER`, `VIEWER`) per user for individual documents.
