# AI Task & Document Integration Design

This document details the architecture for integrating Generative AI (Gemini 2.5/3.5) with A-Collab's Tasks and Document systems. It explains structured JSON schemas, RAG grounding, and batch transactional creation.

---

## 🤖 AI + Task Creation Flow

```
                      User Prompt: "@task Create backend plan"
                                       │
                                       ▼
                             [ RAG Context Fetch ]
                  Retrieves workspace goals + tech guidelines
                                       │
                                       ▼
                            [ Gemini API Request ]
                 Enforces Structured JSON Output Schema (Pydantic/JSON)
                                       │
                                       ▼
                             [ Validated Schema ]
                 Ensures correct title, type, and priority enums
                                       │
                                       ▼
                       [ Database Batch Transaction ]
               Inserts tasks, triggers Socket.io & Notifications
```

### 1. Gemini Structured Output Schema
To guarantee that the AI generates valid data, we use Gemini's structured output capability. The JSON Schema matches our Prisma models.

#### Target Output Schema
```json
{
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "type": { "type": "string", "enum": ["TASK", "BUG", "FEATURE", "EPIC", "STORY", "SUBTASK"] },
          "priority": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          "status": { "type": "string", "enum": ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED", "CANCELLED"] },
          "estimatedHours": { "type": "number" }
        },
        "required": ["title", "description", "type", "priority", "status"]
      }
    }
  },
  "required": ["tasks"]
}
```

---

## 📄 AI + Documents Flow

The AI Document subsystem handles two main flows:
1. **Document Summarization:** Analyzes all `DocumentBlock` contents of a document and generates a concise summary.
2. **Template Generation:** Automatically generates structural documents (like API docs or Product Requirement Documents) from user commands.

### Summarization Algorithm
1. Retrieve all blocks for document `docId` ordered by `position`.
2. Concatenate block contents into a clean Markdown representation.
3. Pass the content to Gemini with the instruction: *"Generate a concise executive summary for this document."*
4. Return the summary to the user or save it as a special `DocumentBlock` / RAG Knowledge Page.

### Template Generation Algorithm
1. User requests: *"Generate API documentation for authentication endpoints."*
2. Prompt is sent to Gemini with instructions to output a list of structural content blocks.
3. The response is parsed as a series of block objects:
   ```json
   [
     { "type": "HEADING", "content": "Authentication API Docs", "position": 1.0 },
     { "type": "PARAGRAPH", "content": "This document describes details about registration and login...", "position": 2.0 }
   ]
   ```
4. Insert the new `Document` and its corresponding `DocumentBlock` records in a Prisma transaction.
