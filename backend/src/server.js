import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { initSocket } from "./socket/index.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import aiFlatRoutes from "./routes/aiFlat.routes.js";
import { startBackgroundWorkers } from "./services/queue.service.js";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Inject socket into req
app.use((req, res, next) => {
  req.io = app.get("io");
  next();
});

// ── Health check ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "A-Collab API is running 🚀" });
});

// Serve uploads statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/invites", invitationRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/ai", aiFlatRoutes);

// ── 404 handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[GlobalError]", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  startBackgroundWorkers();
});
