import prisma from "../config/db.js";
import { logAction } from "../services/audit.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/organizations/:orgId/workspaces
// Create a workspace inside an organization
// ─────────────────────────────────────────────────────────────────────────────
export const createWorkspace = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, slug, description, isPublic } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "name and slug are required." });
    }

    // Checking org membership (injected by requireOrgRole)
    if (!req.orgMember || !['OWNER', 'ADMIN'].includes(req.orgMember.role)) {
      return res.status(403).json({ success: false, message: "Only Org Owners and Admins can create workspaces." });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        isPublic: isPublic ?? false,
        organizationId: orgId,
      },
    });

    // Auto-add the creator as OWNER in WorkspaceMember
    await prisma.workspaceMember.create({
      data: {
        userId: req.user.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });

    // Auto-create a default general channel
    await prisma.channel.create({
      data: {
        workspaceId: workspace.id,
        name: "general",
        slug: "general",
        description: "General workspace discussion",
        type: "PUBLIC",
        createdBy: req.user.id,
      },
    });

    await logAction({
      actorId: req.user.id,
      organizationId: orgId,
      workspaceId: workspace.id,
      action: "WORKSPACE_CREATED",
      entityType: "WORKSPACE",
      entityId: workspace.id,
    });

    return res.status(201).json({ success: true, workspace });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Workspace slug already used in this organization." });
    }
    console.error("[createWorkspace]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/organizations/:orgId/workspaces
// List all workspaces in an organization
// ─────────────────────────────────────────────────────────────────────────────
export const listWorkspaces = async (req, res) => {
  try {
    const { orgId } = req.params;

    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, workspaces });
  } catch (err) {
    console.error("[listWorkspaces]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId
// Get a single workspace with its members
// ─────────────────────────────────────────────────────────────────────────────
export const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        members: {
          include: { user: { select: { id: true, username: true, email: true } } },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found." });
    }

    return res.status(200).json({ success: true, workspace });
  } catch (err) {
    console.error("[getWorkspace]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/workspaces/:workspaceId
// Update workspace settings
// ─────────────────────────────────────────────────────────────────────────────
export const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, isPublic } = req.body;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic })
      }
    });

    await logAction({
      actorId: req.user.id,
      workspaceId: workspace.id,
      action: "WORKSPACE_UPDATED",
      entityType: "WORKSPACE",
      entityId: workspace.id,
    });

    return res.status(200).json({ success: true, workspace });
  } catch (err) {
    console.error("[updateWorkspace]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceId
// Delete a workspace
// ─────────────────────────────────────────────────────────────────────────────
export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    await logAction({
      actorId: req.user.id,
      workspaceId: workspaceId,
      action: "WORKSPACE_DELETED",
      entityType: "WORKSPACE",
      entityId: workspaceId,
    });

    return res.status(200).json({ success: true, message: "Workspace deleted successfully." });
  } catch (err) {
    console.error("[deleteWorkspace]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export const listUserWorkspaces = async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: {
          include: {
            organization: { select: { id: true, name: true, slug: true } },
            _count: { select: { members: true } }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      role: m.role,
      memberCount: m.workspace._count.members
    }));

    return res.status(200).json({ success: true, workspaces });
  } catch (err) {
    console.error("[listUserWorkspaces]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
