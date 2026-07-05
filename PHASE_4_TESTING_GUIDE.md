# 🤖 Phase 4 Enterprise AI Workspace Assistant Testing Guide

Follow this guide sequentially in Postman to test the full flow of AI Conversations, RAG Context, Caching, Decoupled Tool Registry, Personas, and Cost Tracking.

> **Prerequisite:** Make sure you have your Workspace ID (referred to as `<WORKSPACE_ID>`) and User Token from the previous phases.

---

### Step 1: Create an AI Conversation Tree
This instantiates a ChatGPT-like dialogue session scoped to your workspace.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/conversations`
- **Body (JSON):**
  ```json
  {
    "title": "Backend Architecture Discussions"
  }
  ```
> 📝 **Action:** Copy the `conversation.id` from the response (referred to as `<CONVERSATION_ID>`).

---

### Step 2: Configure Workspace Persona & LLM Settings
Let's customize your AI assistant's name and behavior.

- **Method:** `PATCH`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/persona`
- **Body (JSON):**
  ```json
  {
    "name": "DevBot",
    "behavior": "TECHNICAL"
  }
  ```

Now, let's specify model parameters (like lowering temperature for direct answers):
- **Method:** `PATCH`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/config`
- **Body (JSON):**
  ```json
  {
    "preferredModel": "gemini-2.5-flash",
    "temperature": 0.3,
    "maxTokens": 1000,
    "baseSystemPrompt": "You are a senior systems architect. Respond concisely."
  }
  ```

---

### Step 3: Populate the RAG Knowledge Base
Add direct workspace instructions so the AI can answer contextual queries.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/knowledge`
- **Body (JSON):**
  ```json
  {
    "category": "DEPLOYMENT",
    "title": "Staging Server details",
    "content": "Our staging server is deployed locally on port 5001. Database is MySQL hosted on localhost:3306."
  }
  ```

---

### Step 4: Ask a Contextual Question (Test RAG & Caching)
Let's prompt the AI. It should automatically load the Knowledge details we saved in Step 3 to answer.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/ai/conversations/<CONVERSATION_ID>/messages`
- **Body (JSON):**
  ```json
  {
    "prompt": "What port is staging deployed on, and what is our database stack?"
  }
  ```
*(You will see the assistant return a technical response referencing port 5001 and MySQL).*

> ⚡ **Test the Caching Layer:** Run the exact same request again. 
> Notice that `cached: true` appears in the response, and latency is near-instant (under 20ms) because it hit the `AICache` table!

---

### Step 5: Test the Decoupled Tool Registry (Function Calling)
Let's ask the AI to perform a backend task on our behalf (e.g. creating a workspace channel).

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/ai/conversations/<CONVERSATION_ID>/messages`
- **Body (JSON):**
  ```json
  {
    "prompt": "Create a channel named engineering-tasks"
  }
  ```
*(Verify the response confirms the channel was created. You can hit `GET /api/workspaces/<WORKSPACE_ID>/channels` to confirm it exists in A-Collab!).*

---

### Step 6: Test AI Permissions (Disable Tool Execution)
Let's simulate a workspace owner disabling the AI's ability to create channels.

- **Method:** `PATCH`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/permissions`
- **Body (JSON):**
  ```json
  {
    "permissions": [
      { "toolName": "createChannel", "isAllowed": false }
    ]
  }
  ```

Now, try running **Step 5** (asking it to create a channel) again:
*(The assistant should gracefully explain that creating channels is disabled in this workspace by the administrator).*

---

### Step 7: Check the AI Analytics & Cost Dashboard
Workspace admins can monitor token expenditures and estimated USD costs.

- **Method:** `GET`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/analytics`
*(Returns prompt/completion tokens used, average latency, and estimated USD spend calculated from Gemini token pricing).*

---

### Step 8: Manually Trigger Background Summary Worker
We have active workers polling jobs. Let's queue a daily summary of yesterday's workspace messages.

- **Method:** `POST`
- **URL:** `http://localhost:5001/api/workspaces/<WORKSPACE_ID>/ai/jobs`
- **Body (JSON):**
  ```json
  {
    "jobType": "DAILY_SUMMARY"
  }
  ```
*(Returns 202 Accepted. The background worker picks up the job, retrieves channel context, queries Gemini, writes the summary back to the Knowledge table, and completes the task!).*
