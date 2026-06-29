import prisma from "../config/db.js";

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
// List organizations where the user is owner
// ─────────────────────────────────────────────────────────────────────────────
export const listMyOrganizations = async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { ownerId: req.user.id },
      include: { _count: { select: { workspaces: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, organizations: orgs });
  } catch (err) {
    console.error("[listMyOrganizations]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/organizations/:orgId
// Get a single organization by ID (owner only)
// ─────────────────────────────────────────────────────────────────────────────
export const getOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { workspaces: true, owner: { select: { id: true, username: true, email: true } } },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found." });
    }

    if (org.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({ success: true, organization: org });
  } catch (err) {
    console.error("[getOrganization]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
