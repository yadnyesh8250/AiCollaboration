import crypto from "crypto";
import prisma from "../config/db.js";
import { logAction } from "../services/audit.service.js";
import { sendNotification } from "../services/notification.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/invites
// Generate an invite token for a workspace
// ─────────────────────────────────────────────────────────────────────────────
export const createInvite = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: "Email and role are required." });
    }

    // Checking workspace membership (injected by requireWorkspaceRole)
    if (!req.workspaceMember || !['OWNER', 'ADMIN'].includes(req.workspaceMember.role)) {
      return res.status(403).json({ success: false, message: "Only Workspace Owners and Admins can invite users." });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId,
          }
        }
      });
      if (existingMember) {
        return res.status(400).json({ success: false, message: "User is already a member of this workspace." });
      }
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        invitedById: req.user.id,
        expiresAt,
      }
    });

    await logAction({
      actorId: req.user.id,
      workspaceId,
      action: "USER_INVITED",
      entityType: "INVITATION",
      entityId: invite.id,
      metadata: { email, role }
    });

    // In a real app, send an email here.
    return res.status(201).json({ success: true, inviteToken: token, message: "Invite generated successfully." });
  } catch (err) {
    console.error("[createInvite]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invites/accept
// Accept an invite token
// ─────────────────────────────────────────────────────────────────────────────
export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Invite token is required." });
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token }
    });

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invalid invite token." });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Invite is already ${invite.status.toLowerCase()}.` });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      });
      return res.status(400).json({ success: false, message: "Invite has expired." });
    }

    // The currently authenticated user accepting the invite must match the email it was sent to.
    if (req.user.email !== invite.email) {
      return res.status(403).json({ success: false, message: "This invite was not sent to your email address." });
    }

    // Fetch workspace to get parent organization ID
    const workspace = await prisma.workspace.findUnique({
      where: { id: invite.workspaceId }
    });
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found." });
    }

    // Auto-link user to the parent organization
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: workspace.organizationId
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        organizationId: workspace.organizationId,
        role: invite.role === "OWNER" || invite.role === "ADMIN" ? "ADMIN" : "MEMBER"
      }
    });

    // Create the workspace member
    const member = await prisma.workspaceMember.create({
      data: {
        userId: req.user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      }
    });

    // Update invite status
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" }
    });

    await logAction({
      actorId: req.user.id,
      workspaceId: invite.workspaceId,
      action: "INVITE_ACCEPTED",
      entityType: "MEMBER",
      entityId: member.id,
    });

    // Notify the inviter
    await sendNotification({
      recipientId: invite.invitedById,
      actorId: req.user.id,
      type: "INVITE_ACCEPTED",
      payload: { workspaceId: invite.workspaceId, email: invite.email }
    });

    return res.status(200).json({ success: true, message: "Successfully joined the workspace." });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "You are already a member of this workspace." });
    }
    console.error("[acceptInvite]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listPendingInvites = async (req, res) => {
  try {
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        email: req.user.email,
        status: "PENDING"
      },
      include: {
        workspace: {
          select: {
            name: true,
            organization: { select: { name: true } }
          }
        },
        invitedBy: {
          select: { username: true }
        }
      }
    });

    return res.json({ success: true, invites });
  } catch (err) {
    console.error("[listPendingInvites]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const declineInvite = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token }
    });

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invitation not found." });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Invite is already ${invite.status.toLowerCase()}.` });
    }

    if (invite.email !== req.user.email) {
      return res.status(403).json({ success: false, message: "This invite was not sent to your email address." });
    }

    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "DECLINED" }
    });

    return res.json({ success: true, message: "Invitation declined successfully." });
  } catch (err) {
    console.error("[declineInvite]", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
