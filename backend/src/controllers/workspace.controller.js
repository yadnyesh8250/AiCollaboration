import prisma from "../config/db.js";

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

    // Verify org exists and user is the owner
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found." });
    }
    if (org.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the org owner can create workspaces." });
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

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found." });
    }

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

    // Allow access if user is a member OR the workspace is public
    const isMember = workspace.members.some((m) => m.userId === req.user.id);
    if (!workspace.isPublic && !isMember) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({ success: true, workspace });
  } catch (err) {
    console.error("[getWorkspace]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
