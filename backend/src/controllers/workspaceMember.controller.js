import prisma from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/members
// Add a member to a workspace (OWNER / ADMIN only)
// Body: { userId, role }
// ─────────────────────────────────────────────────────────────────────────────
export const addMember = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, role = "MEMBER" } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required." });
    }

    const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found." });
    }

    // Only OWNER or ADMIN can add members
    const requester = workspace.members.find((m) => m.userId === req.user.id);
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ success: false, message: "Only OWNER or ADMIN can add members." });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    const member = await prisma.workspaceMember.create({
      data: { userId, workspaceId, role },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    return res.status(201).json({ success: true, member });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "User is already a member of this workspace." });
    }
    console.error("[addMember]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/members
// List all members of a workspace
// ─────────────────────────────────────────────────────────────────────────────
export const listMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return res.status(200).json({ success: true, members });
  } catch (err) {
    console.error("[listMembers]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/members/:memberId
// Update a member's role (OWNER only)
// Body: { role }
// ─────────────────────────────────────────────────────────────────────────────
export const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Verify requester is OWNER
    const requester = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id },
    });
    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ success: false, message: "Only OWNER can change roles." });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, username: true, email: true } } },
    });

    return res.status(200).json({ success: true, member: updated });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Member not found." });
    }
    console.error("[updateMemberRole]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceId/members/:memberId
// Remove a member (OWNER / ADMIN, or self-removal)
// ─────────────────────────────────────────────────────────────────────────────
export const removeMember = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;

    const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!target || target.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, message: "Member not found." });
    }

    const requester = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id },
    });

    const isSelf = target.userId === req.user.id;
    const isOwnerOrAdmin = requester && ["OWNER", "ADMIN"].includes(requester.role);

    if (!isSelf && !isOwnerOrAdmin) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    return res.status(200).json({ success: true, message: "Member removed." });
  } catch (err) {
    console.error("[removeMember]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
