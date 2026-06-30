import prisma from "../config/db.js";

/**
 * Log an action to the AuditLog table.
 * 
 * @param {Object} params
 * @param {string} params.actorId - ID of the user performing the action
 * @param {string} [params.organizationId] - Relevant organization
 * @param {string} [params.workspaceId] - Relevant workspace
 * @param {string} params.action - e.g. "WORKSPACE_CREATED", "USER_INVITED"
 * @param {string} params.entityType - e.g. "WORKSPACE", "INVITATION", "MEMBER"
 * @param {string} [params.entityId] - ID of the affected entity
 * @param {Object} [params.metadata] - Any extra JSON context
 */
export const logAction = async ({
  actorId,
  organizationId = null,
  workspaceId = null,
  action,
  entityType,
  entityId = null,
  metadata = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        organizationId,
        workspaceId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  } catch (err) {
    console.error("[AuditService] Failed to create audit log:", err);
    // We intentionally don't throw to prevent breaking the main flow if audit logging fails
  }
};
