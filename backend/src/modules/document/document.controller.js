import prisma from "../../config/db.js";
import { sendNotification } from "../../services/notification.service.js";

// Helper to determine user permission role for a document
export const getDocumentRole = async (documentId, userId) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });
    if (!doc) return null;

    // Creator has OWNER permissions
    if (doc.createdBy === userId) return "OWNER";

    // Check workspace membership
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: doc.workspaceId } }
    });
    if (!wsMember) return null; // Not in workspace, no access

    // Check explicit override permission
    const override = await prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } }
    });
    if (override) return override.role;

    // Workspace Owner / Admin defaults to EDITOR
    if (["OWNER", "ADMIN"].includes(wsMember.role)) {
      return "EDITOR";
    }

    // Default by visibility
    if (doc.visibility === "PRIVATE") {
      return null; // Private, and no override, so no access
    }

    // WORKSPACE / PUBLIC visibility
    if (wsMember.role === "VIEWER") return "VIEWER";
    return "EDITOR"; // Members default to Editor
  } catch (err) {
    console.error("[getDocumentRole]", err);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const createDocument = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, parentDocumentId, visibility = "WORKSPACE", icon, coverImage } = req.body;

    // Generate url friendly slug from title + random prefix
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const slug = `${baseSlug}-${random}`;

    // Verify parent document if provided
    if (parentDocumentId) {
      const parent = await prisma.document.findUnique({ where: { id: parentDocumentId } });
      if (!parent || parent.workspaceId !== workspaceId) {
        return res.status(400).json({ success: false, message: "Invalid parent document." });
      }
    }

    const doc = await prisma.document.create({
      data: {
        workspaceId,
        title,
        slug,
        icon,
        coverImage,
        parentDocumentId: parentDocumentId || null,
        visibility,
        createdBy: req.user.id
      }
    });

    // Create default block for new documents (an empty paragraph)
    await prisma.documentBlock.create({
      data: {
        documentId: doc.id,
        type: "PARAGRAPH",
        content: "Start writing...",
        position: 1000.0
      }
    });

    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit("documentCreated", doc);
    }

    return res.status(201).json({ success: true, document: doc });
  } catch (err) {
    console.error("[createDocument]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Fetch all documents in the workspace
    const allDocs = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" }
    });

    // Filter documents where the user has read permissions (role is not null)
    const filteredDocs = [];
    for (const doc of allDocs) {
      const role = await getDocumentRole(doc.id, req.user.id);
      if (role !== null) {
        filteredDocs.push({ ...doc, userRole: role });
      }
    }

    return res.status(200).json({ success: true, documents: filteredDocs });
  } catch (err) {
    console.error("[listDocuments]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await getDocumentRole(id, req.user.id);
    if (role === null) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, email: true } },
        blocks: { orderBy: { position: "asc" } },
        childDocuments: { select: { id: true, title: true, slug: true } }
      }
    });

    return res.status(200).json({ success: true, document: { ...doc, userRole: role } });
  } catch (err) {
    console.error("[getDocument]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, visibility, icon, coverImage } = req.body;

    const role = await getDocumentRole(id, req.user.id);
    if (role === null || role === "VIEWER" || role === "COMMENTER") {
      return res.status(403).json({ success: false, message: "Access denied. Requires Editor or Owner permissions." });
    }

    const data = {};
    if (title) data.title = title;
    if (visibility) data.visibility = visibility;
    if (icon !== undefined) data.icon = icon;
    if (coverImage !== undefined) data.coverImage = coverImage;

    const updated = await prisma.document.update({
      where: { id },
      data
    });

    // Notify updates
    if (req.io) {
      req.io.to(`workspace:${updated.workspaceId}`).emit("documentUpdated", updated);
    }

    // Send notifications to other editors/members if necessary
    return res.status(200).json({ success: true, document: updated });
  } catch (err) {
    console.error("[updateDocument]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await getDocumentRole(id, req.user.id);
    if (role !== "OWNER") {
      // Allow workspace OWNER/ADMIN to delete document anyway
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
      });
      const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
      if (!isWsAdmin) {
        return res.status(403).json({ success: false, message: "Access denied. Only the Document Owner or Workspace Admins can delete documents." });
      }
    }

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    await prisma.document.delete({ where: { id } });

    if (req.io) {
      req.io.to(`workspace:${doc.workspaceId}`).emit("documentDeleted", { documentId: id });
    }

    return res.status(200).json({ success: true, message: "Document deleted successfully." });
  } catch (err) {
    console.error("[deleteDocument]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

export const bulkUpdateBlocks = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { blocks } = req.body; // Array of { id, type, content, position }

    if (!Array.isArray(blocks)) {
      return res.status(400).json({ success: false, message: "blocks must be an array." });
    }

    const role = await getDocumentRole(documentId, req.user.id);
    if (role === null || role === "VIEWER" || role === "COMMENTER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Execute in a transaction: delete previous blocks, insert new blocks
    const allowedTypes = ["HEADING", "PARAGRAPH", "CHECKLIST", "CODE", "QUOTE", "TABLE", "IMAGE", "DIVIDER"];
    const blocksData = blocks.map(b => {
      const type = allowedTypes.includes(b.type) ? b.type : "PARAGRAPH";
      const item = {
        documentId,
        type,
        content: b.content || "",
        position: parseFloat(b.position || 1000.0)
      };
      if (b.id) {
        item.id = b.id;
      }
      return item;
    });

    await prisma.$transaction([
      prisma.documentBlock.deleteMany({ where: { documentId } }),
      prisma.documentBlock.createMany({
        data: blocksData
      })
    ]);

    // Fetch the newly updated list
    const updatedBlocks = await prisma.documentBlock.findMany({
      where: { documentId },
      orderBy: { position: "asc" }
    });

    const doc = await prisma.document.findUnique({ where: { id: documentId } });

    // Broadcast socket event
    if (req.io) {
      req.io.to(`workspace:${doc.workspaceId}`).emit("documentBlocksUpdated", { documentId, blocks: updatedBlocks });
    }

    return res.status(200).json({ success: true, blocks: updatedBlocks });
  } catch (err) {
    console.error("[bulkUpdateBlocks]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT VERSION HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export const createVersionSnapshot = async (req, res) => {
  try {
    const { documentId } = req.params;

    const role = await getDocumentRole(documentId, req.user.id);
    if (role === null || role === "VIEWER" || role === "COMMENTER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Get current blocks of the document
    const blocks = await prisma.documentBlock.findMany({
      where: { documentId },
      orderBy: { position: "asc" }
    });

    // Find the current max version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: "desc" },
      select: { version: true }
    });
    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    const versionSnapshot = await prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        content: JSON.stringify(blocks),
        editedBy: req.user.id
      }
    });

    return res.status(201).json({ success: true, version: versionSnapshot });
  } catch (err) {
    console.error("[createVersionSnapshot]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listVersions = async (req, res) => {
  try {
    const { documentId } = req.params;

    const role = await getDocumentRole(documentId, req.user.id);
    if (role === null) return res.status(403).json({ success: false, message: "Access denied." });

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      include: { editor: { select: { id: true, username: true } } }
    });

    return res.status(200).json({ success: true, versions });
  } catch (err) {
    console.error("[listVersions]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const restoreVersion = async (req, res) => {
  try {
    const { documentId, versionId } = req.params;

    const role = await getDocumentRole(documentId, req.user.id);
    if (role === null || role === "VIEWER" || role === "COMMENTER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });

    if (!version || version.documentId !== documentId) {
      return res.status(404).json({ success: false, message: "Version snapshot not found." });
    }

    const restoredBlocks = JSON.parse(version.content);

    // Run transaction to replace blocks
    await prisma.$transaction([
      prisma.documentBlock.deleteMany({ where: { documentId } }),
      prisma.documentBlock.createMany({
        data: restoredBlocks.map(b => ({
          documentId,
          type: b.type,
          content: b.content,
          position: parseFloat(b.position)
        }))
      })
    ]);

    const finalBlocks = await prisma.documentBlock.findMany({
      where: { documentId },
      orderBy: { position: "asc" }
    });

    const doc = await prisma.document.findUnique({ where: { id: documentId } });

    if (req.io) {
      req.io.to(`workspace:${doc.workspaceId}`).emit("documentBlocksUpdated", { documentId, blocks: finalBlocks });
    }

    return res.status(200).json({ success: true, blocks: finalBlocks, message: "Document restored successfully." });
  } catch (err) {
    console.error("[restoreVersion]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export const listDocumentPermissions = async (req, res) => {
  try {
    const { documentId } = req.params;

    const role = await getDocumentRole(documentId, req.user.id);
    if (role !== "OWNER") {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
      });
      const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
      if (!isWsAdmin) {
        return res.status(403).json({ success: false, message: "Access denied. Only Owners and Workspace Admins can view granular permissions." });
      }
    }

    const permissions = await prisma.documentPermission.findMany({
      where: { documentId },
      include: { user: { select: { id: true, username: true, email: true } } }
    });

    return res.status(200).json({ success: true, permissions });
  } catch (err) {
    console.error("[listDocumentPermissions]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const updateDocumentPermission = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, role } = req.body; // role: OWNER, EDITOR, COMMENTER, VIEWER



    const docRole = await getDocumentRole(documentId, req.user.id);
    if (docRole !== "OWNER") {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
      });
      const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
      if (!isWsAdmin) {
        return res.status(403).json({ success: false, message: "Access denied. Only Owners and Workspace Admins can update permissions." });
      }
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });

    // Create or update permission
    const permission = await prisma.documentPermission.upsert({
      where: { documentId_userId: { documentId, userId } },
      update: { role },
      create: { documentId, userId, role }
    });

    // Notify user of sharing event
    await sendNotification({
      recipientId: userId,
      actorId: req.user.id,
      type: "DOCUMENT_SHARED",
      payload: { documentId, role, title: doc.title }
    });

    return res.status(200).json({ success: true, permission });
  } catch (err) {
    console.error("[updateDocumentPermission]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const removeDocumentPermission = async (req, res) => {
  try {
    const { documentId, userId } = req.params;

    const docRole = await getDocumentRole(documentId, req.user.id);
    if (docRole !== "OWNER") {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

      const wsMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: req.user.id, workspaceId: doc.workspaceId } }
      });
      const isWsAdmin = wsMember && ["OWNER", "ADMIN"].includes(wsMember.role);
      if (!isWsAdmin) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
    }

    await prisma.documentPermission.delete({
      where: { documentId_userId: { documentId, userId } }
    });

    return res.status(200).json({ success: true, message: "Override permission removed." });
  } catch (err) {
    console.error("[removeDocumentPermission]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
