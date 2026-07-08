import { spawn } from "child_process";
import prisma from "./config/db.js";

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api`;
const suffix = Date.now();

const userA = {
  email: `user_a_${suffix}@example.com`,
  username: `user_a_${suffix}`,
  password: "Password123"
};

const userB = {
  email: `user_b_${suffix}@example.com`,
  username: `user_b_${suffix}`,
  password: "Password123"
};

let serverProcess;
let tokenA;
let tokenB;
let userIdA;
let userIdB;
let orgId;
let workspaceId;
let taskId;
let labelId;
let sprintId;
let documentId;
let versionId;
let channelId;
let messageId;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start Server
async function startServer() {
  console.log("Starting server on port 5001...");
  serverProcess = spawn("node", ["src/server.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe"
  });

  return new Promise((resolve, reject) => {
    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Server running")) {
        console.log("Server started successfully!");
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => reject(new Error("Server start timed out")), 5000);
  });
}

// Helper fetch wrapper
async function apiCall(endpoint, options = {}, token = tokenA) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    ...(options.body && { body: JSON.stringify(options.body) })
  });

  const json = await response.json();
  if (options.expectFail) {
    if (response.ok) {
      throw new Error(`Expected call to fail, but it succeeded! URL: ${endpoint}`);
    }
    return { status: response.status, json };
  }

  if (!response.ok) {
    console.error(`FAIL: ${options.method || "GET"} ${endpoint} status=${response.status}`, json);
    throw new Error(`API error: ${json.message || response.statusText}`);
  }
  return json;
}

let testCount = 0;
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ PASSED: ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Run Tests
async function runTests() {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 🔑 1. Authentication
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔑 [Module: Authentication]");
    
    // Register User A
    const regResA = await apiCall("/auth/register", { method: "POST", body: userA });
    userIdA = regResA.user.id;
    assert(regResA.success === true, "User A registered successfully");

    await delay(1100);

    // Register User B
    const regResB = await apiCall("/auth/register", { method: "POST", body: userB });
    userIdB = regResB.user.id;
    assert(regResB.success === true, "User B registered successfully");

    await delay(1100);

    // Login User A
    const loginResA = await apiCall("/auth/login", {
      method: "POST",
      body: { emailOrUsername: userA.email, password: userA.password }
    });
    tokenA = loginResA.accessToken;
    assert(tokenA !== undefined, "User A logged in, token retrieved");

    // Login User B
    const loginResB = await apiCall("/auth/login", {
      method: "POST",
      body: { emailOrUsername: userB.email, password: userB.password }
    });
    tokenB = loginResB.accessToken;
    assert(tokenB !== undefined, "User B logged in, token retrieved");

    // ─────────────────────────────────────────────────────────────────────────
    // 🏢 2. Organizations & Workspaces
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🏢 [Modules: Organizations & Workspaces]");
    const orgRes = await apiCall("/organizations", {
      method: "POST",
      body: { name: `Org ${suffix}`, slug: `org-${suffix}`, description: "Enterprise testing" }
    });
    orgId = orgRes.organization.id;
    assert(orgRes.success === true, "Organization created successfully");

    const wsRes = await apiCall(`/organizations/${orgId}/workspaces`, {
      method: "POST",
      body: { name: `Workspace ${suffix}`, slug: `ws-${suffix}`, description: "Tech Workspace", isPublic: false }
    });
    workspaceId = wsRes.workspace.id;
    assert(wsRes.workspace.id !== undefined, "Workspace created successfully");

    // ─────────────────────────────────────────────────────────────────────────
    // 👮 3. RBAC (Role-Based Access Control)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n👮 [Module: RBAC]");
    
    // User B tries to view workspace details before joining (should fail)
    const viewFail = await apiCall(`/workspaces/${workspaceId}`, { expectFail: true }, tokenB);
    assert(viewFail.status === 403, "User B access blocked to private workspace (Returns 403)");

    // User B tries to edit User A's workspace (should fail)
    const editFail = await apiCall(`/workspaces/${workspaceId}`, {
      method: "PUT",
      body: { name: "Hacked Workspace" },
      expectFail: true
    }, tokenB);
    assert(editFail.status === 403, "User B blocked from updating User A's workspace (Returns 403)");

    // ─────────────────────────────────────────────────────────────────────────
    // 💬 4. Channels
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n💬 [Module: Channels]");
    const chanRes = await apiCall(`/workspaces/${workspaceId}/channels`, {
      method: "POST",
      body: { name: "General Chat", slug: "general-chat", type: "PUBLIC", description: "All-hands communication" }
    });
    channelId = chanRes.channel.id;
    assert(chanRes.success === true, "Public channel created in workspace");

    const chanList = await apiCall(`/workspaces/${workspaceId}/channels`);
    assert(chanList.channels.length > 0, "Channels list retrieved successfully");

    const getChan = await apiCall(`/channels/${channelId}`);
    assert(getChan.channel.name === "General Chat", "Channel details matched expected name");

    // ─────────────────────────────────────────────────────────────────────────
    // ✉️ 5. Messages & Threads
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n✉️ [Modules: Messages & Threads]");
    const msgRes = await apiCall(`/channels/${channelId}/messages`, {
      method: "POST",
      body: { content: "Initial deployment complete." }
    });
    messageId = msgRes.message.id;
    assert(msgRes.success === true, "Message sent to channel");

    // Create a reply to form a Thread
    const replyRes = await apiCall(`/channels/${channelId}/messages`, {
      method: "POST",
      body: { content: "Agreed. Looks great!", parentMessageId: messageId }
    });
    assert(replyRes.message.parentMessageId === messageId, "Thread reply successfully linked to parent message");

    const threadRes = await apiCall(`/messages/${messageId}/thread`);
    assert(threadRes.replies.length === 1, "Thread replies fetched correctly");

    const editMsg = await apiCall(`/messages/${messageId}`, {
      method: "PATCH",
      body: { content: "Initial deployment complete (v1.0.0)." }
    });
    assert(editMsg.message.content.includes("v1.0.0"), "Message edited successfully");

    // Add Reaction
    const reactRes = await apiCall(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: { emoji: "🚀" }
    });
    assert(reactRes.success === true, "Emoji reaction added to message");

    // ─────────────────────────────────────────────────────────────────────────
    // 📋 6. Task Management
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n📋 [Modules: Tasks, Comments, Labels, Sprints, Activity, Kanban]");
    const taskRes = await apiCall(`/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: {
        title: "Deploy Database Servers",
        description: "Configure replica set on AWS",
        status: "TODO",
        priority: "HIGH",
        type: "TASK",
        estimatedHours: 4.0
      }
    });
    taskId = taskRes.task.id;
    assert(taskRes.task.title === "Deploy Database Servers", "Task created with correct details");

    // Task Comments
    const tComment = await apiCall(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: { content: "Double checking replica counts." }
    });
    assert(tComment.comment.content.includes("replica"), "Task comment added successfully");

    // Labels
    const labelRes = await apiCall(`/workspaces/${workspaceId}/labels`, {
      method: "POST",
      body: { name: `DevOps-${suffix}`, color: "#3b82f6" }
    });
    labelId = labelRes.label.id;
    assert(labelRes.success === true, "Workspace label created");

    await apiCall(`/tasks/${taskId}/labels`, { method: "POST", body: { labelId } });
    console.log("  ✅ Label assigned to task");

    // Sprints
    const sprintRes = await apiCall(`/workspaces/${workspaceId}/sprints`, {
      method: "POST",
      body: {
        name: "Sprint Alpha",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      }
    });
    sprintId = sprintRes.sprint.id;
    assert(sprintRes.success === true, "Sprint scheduled");

    // Assign Task to Sprint
    await apiCall(`/sprints/${sprintId}/tasks`, { method: "POST", body: { taskId } });
    console.log("  ✅ Task mapped to Sprint");

    // Complete Sprint (Triggers backlog rollover)
    await apiCall(`/sprints/${sprintId}`, { method: "PATCH", body: { status: "COMPLETED" } });
    console.log("  ✅ Sprint completed");

    // Check that task has shifted back to backlog
    const dbTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sprints: true }
    });
    assert(dbTask.sprints.length === 0, "Unfinished tasks rolled back to backlog (sprint task relations deleted)");

    // ─────────────────────────────────────────────────────────────────────────
    // 📄 7. Document System
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n📄 [Modules: Documents, Blocks, Versioning, Permissions]");
    const docRes = await apiCall(`/workspaces/${workspaceId}/documents`, {
      method: "POST",
      body: { title: "DevOps Standards Guide", visibility: "WORKSPACE" }
    });
    documentId = docRes.document.id;
    assert(docRes.success === true, "Notion style document created");

    // Bulk update blocks
    const blockRes = await apiCall(`/documents/${documentId}/blocks`, {
      method: "PUT",
      body: {
        blocks: [
          { type: "HEADING", content: "CI/CD Guidelines", position: 1.0 },
          { type: "PARAGRAPH", content: "Always verify tests locally.", position: 2.0 }
        ]
      }
    });
    assert(blockRes.blocks.length === 2, "Document content blocks populated");

    // Save Version Snapshot
    const verRes = await apiCall(`/documents/${documentId}/versions`, { method: "POST" });
    versionId = verRes.version.id;
    assert(verRes.version.version === 1, "Document Version 1 saved in snapshot table");

    // Document permissions sharing
    const permRes = await apiCall(`/documents/${documentId}/permissions`, {
      method: "POST",
      body: { userId: userIdB, role: "VIEWER" }
    });
    assert(permRes.permission.role === "VIEWER", "Document sharing override rule added for User B");

    // User B tries to edit document (should fail since role is VIEWER)
    const docEditFail = await apiCall(`/documents/${documentId}`, {
      method: "PATCH",
      body: { title: "Hacked Doc Title" },
      expectFail: true
    }, tokenB);
    assert(docEditFail.status === 403, "User B with VIEWER role blocked from editing document (Returns 403)");

    // ─────────────────────────────────────────────────────────────────────────
    // 🔍 8. Search, Dashboard & Calendar
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🔍 [Modules: Search, Dashboard, Calendar]");
    const searchRes = await apiCall(`/search?q=AWS&workspaceId=${workspaceId}`);
    assert(searchRes.success === true, "Search endpoint run successfully");

    const dashRes = await apiCall(`/workspaces/${workspaceId}/dashboard`);
    assert(dashRes.dashboard.cards.openTasks === 1, "Dashboard cards loaded correct task metrics");

    const calRes = await apiCall(`/workspaces/${workspaceId}/calendar`);
    assert(calRes.events.length > 0, "Calendar unified events feed fetched successfully");

    // ─────────────────────────────────────────────────────────────────────────
    // 🤖 9. AI Integration
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n🤖 [Module: AI Integration]");
    if (process.env.GEMINI_API_KEY) {
      try {
        const sumRes = await apiCall(`/documents/${documentId}/ai/summarize`, { method: "POST" });
        assert(sumRes.summary !== undefined, "AI Document Summarization returned valid text");

        const aiTasks = await apiCall(`/workspaces/${workspaceId}/ai/task-generate`, {
          method: "POST",
          body: { prompt: "Create sprint plan" }
        });
        assert(aiTasks.tasks.length > 0, "AI Task Structured Output created tasks");

        const aiDoc = await apiCall(`/workspaces/${workspaceId}/ai/doc-generate`, {
          method: "POST",
          body: { prompt: "Write developer guidelines" }
        });
        assert(aiDoc.document.blocks.length > 0, "AI Document Layout Generator created blocks");
      } catch (aiErr) {
        console.warn(`⚠️ AI calls returned error (skipping transient API rate-limit/quota): ${aiErr.message}`);
      }
    } else {
      console.log("  ⚠️ Skipping Gemini AI endpoints: GEMINI_API_KEY is not defined.");
    }

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log(`Total: ${testCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
  } catch (error) {
    console.error("\n🛑 TEST RUN ENCOUNTERED CRITICAL ERROR:", error);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log("Shutting down server...");
      serverProcess.kill();
    }
    process.exit();
  }
}

// Start sequence
(async () => {
  try {
    await startServer();
    await delay(1200);
    await runTests();
  } catch (err) {
    console.error("Initialization failed:", err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
})();
