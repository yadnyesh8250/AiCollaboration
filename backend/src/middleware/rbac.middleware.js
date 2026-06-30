import prisma from "../config/db.js";

/**
 * Middleware: Require specific organization roles
 * Expects `req.user.id` to be present (from auth middleware)
 * Expects `orgId` to be in `req.params`
 * 
 * @param {string[]} allowedRoles e.g. ['OWNER', 'ADMIN']
 */
export const requireOrgRole = (allowedRoles) => async (req, res, next) => {
  try {
    const { orgId } = req.params;
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Missing orgId parameter." });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this organization." });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` 
      });
    }

    req.orgMember = membership;
    next();
  } catch (err) {
    console.error("[requireOrgRole]", err);
    return res.status(500).json({ success: false, message: "Internal server error during role check." });
  }
};

/**
 * Middleware: Require specific workspace roles
 * Expects `req.user.id` to be present
 * Expects `workspaceId` to be in `req.params`
 * 
 * @param {string[]} allowedRoles e.g. ['OWNER', 'ADMIN']
 */
export const requireWorkspaceRole = (allowedRoles) => async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "Missing workspaceId parameter." });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId: workspaceId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "Access denied. Not a member of this workspace." });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` 
      });
    }

    req.workspaceMember = membership;
    next();
  } catch (err) {
    console.error("[requireWorkspaceRole]", err);
    return res.status(500).json({ success: false, message: "Internal server error during role check." });
  }
};
