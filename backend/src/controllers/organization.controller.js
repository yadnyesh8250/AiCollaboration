import prisma from "../config/db.js";
import { logAction } from "../services/audit.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/organizations
// Create an organization — the requesting user becomes the owner
// ─────────────────────────────────────────────────────────────────────────────
export const createOrganization = async (req, res) => {
  try {
    const { name, slug, description, logoUrl } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "name and slug are required." });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "slug must be lowercase letters, numbers, and hyphens only.",
      });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        logoUrl,
        ownerId: req.user.id,
      },
    });

    // Automatically create an OrganizationMember record with OWNER role
    await prisma.organizationMember.create({
      data: {
        userId: req.user.id,
        organizationId: org.id,
        role: "OWNER"
      }
    });

    // Audit log
    await logAction({
      actorId: req.user.id,
      organizationId: org.id,
      action: "ORGANIZATION_CREATED",
      entityType: "ORGANIZATION",
      entityId: org.id,
    });

    return res.status(201).json({ success: true, organization: org });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Organization slug already taken." });
    }
    console.error("[createOrganization]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/organizations
// List organizations where the user is a member
// ─────────────────────────────────────────────────────────────────────────────
export const listMyOrganizations = async (req, res) => {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user.id },
      include: {
        organization: {
          include: { _count: { select: { workspaces: true } } }
        }
      },
      orderBy: { joinedAt: "desc" },
    });

    const organizations = memberships.map(m => m.organization);

    return res.status(200).json({ success: true, organizations });
  } catch (err) {
    console.error("[listMyOrganizations]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/organizations/:orgId
// Get a single organization by ID
// ─────────────────────────────────────────────────────────────────────────────
export const getOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { 
        workspaces: true, 
        owner: { select: { id: true, username: true, email: true } },
        members: { include: { user: { select: { id: true, username: true } } } }
      },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found." });
    }

    return res.status(200).json({ success: true, organization: org });
  } catch (err) {
    console.error("[getOrganization]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
