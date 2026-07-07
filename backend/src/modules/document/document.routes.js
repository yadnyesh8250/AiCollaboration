import { Router } from "express";
import {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  bulkUpdateBlocks,
  createVersionSnapshot,
  listVersions,
  restoreVersion,
  listDocumentPermissions,
  updateDocumentPermission,
  removeDocumentPermission
} from "./document.controller.js";
import { summarizeDocument } from "../../controllers/aiProductivity.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/rbac.middleware.js";

// Nested workspace document router (scoped to workspaceId)
const workspaceDocumentRouter = Router({ mergeParams: true });
workspaceDocumentRouter.use(protect);

workspaceDocumentRouter.post("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]), createDocument);
workspaceDocumentRouter.get("/", requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), listDocuments);

// Flat document router (handles page, block, and permission operations)
const flatDocumentRouter = Router();
flatDocumentRouter.use(protect);

flatDocumentRouter.get("/:id", getDocument);
flatDocumentRouter.patch("/:id", updateDocument);
flatDocumentRouter.delete("/:id", deleteDocument);

// Blocks
flatDocumentRouter.put("/:documentId/blocks", bulkUpdateBlocks);

// Versions
flatDocumentRouter.post("/:documentId/versions", createVersionSnapshot);
flatDocumentRouter.get("/:documentId/versions", listVersions);
flatDocumentRouter.post("/:documentId/versions/:versionId/restore", restoreVersion);

// AI
flatDocumentRouter.post("/:documentId/ai/summarize", summarizeDocument);

// Permissions
flatDocumentRouter.get("/:documentId/permissions", listDocumentPermissions);
flatDocumentRouter.post("/:documentId/permissions", updateDocumentPermission);
flatDocumentRouter.delete("/:documentId/permissions/:userId", removeDocumentPermission);

export { workspaceDocumentRouter, flatDocumentRouter };
