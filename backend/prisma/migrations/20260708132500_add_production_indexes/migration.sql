-- CreateIndex
CREATE INDEX `AIJob_status_idx` ON `AIJob`(`status`);

-- CreateIndex
CREATE INDEX `AuditLog_actorId_idx` ON `AuditLog`(`actorId`);

-- CreateIndex
CREATE INDEX `AuditLog_organizationId_idx` ON `AuditLog`(`organizationId`);

-- CreateIndex
CREATE INDEX `AuditLog_workspaceId_idx` ON `AuditLog`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Channel_workspaceId_idx` ON `Channel`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Document_workspaceId_idx` ON `Document`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Label_workspaceId_idx` ON `Label`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Notification_actorId_idx` ON `Notification`(`actorId`);

-- CreateIndex
CREATE INDEX `Task_priority_idx` ON `Task`(`priority`);

-- CreateIndex
CREATE INDEX `Task_type_idx` ON `Task`(`type`);

-- CreateIndex
CREATE INDEX `TaskAttachment_uploadedBy_idx` ON `TaskAttachment`(`uploadedBy`);

-- CreateIndex
CREATE INDEX `Workspace_organizationId_idx` ON `Workspace`(`organizationId`);

-- RenameIndex
ALTER TABLE `AIAuditLog` RENAME INDEX `AIAuditLog_actorId_fkey` TO `AIAuditLog_actorId_idx`;

-- RenameIndex
ALTER TABLE `AIAuditLog` RENAME INDEX `AIAuditLog_workspaceId_fkey` TO `AIAuditLog_workspaceId_idx`;

-- RenameIndex
ALTER TABLE `AIConversation` RENAME INDEX `AIConversation_createdBy_fkey` TO `AIConversation_createdBy_idx`;

-- RenameIndex
ALTER TABLE `AIConversation` RENAME INDEX `AIConversation_workspaceId_fkey` TO `AIConversation_workspaceId_idx`;

-- RenameIndex
ALTER TABLE `AIJob` RENAME INDEX `AIJob_workspaceId_fkey` TO `AIJob_workspaceId_idx`;

-- RenameIndex
ALTER TABLE `AIMessage` RENAME INDEX `AIMessage_conversationId_fkey` TO `AIMessage_conversationId_idx`;

-- RenameIndex
ALTER TABLE `AIMessage` RENAME INDEX `AIMessage_parentId_fkey` TO `AIMessage_parentId_idx`;

-- RenameIndex
ALTER TABLE `Attachment` RENAME INDEX `Attachment_messageId_fkey` TO `Attachment_messageId_idx`;

-- RenameIndex
ALTER TABLE `ChannelMember` RENAME INDEX `ChannelMember_userId_fkey` TO `ChannelMember_userId_idx`;

-- RenameIndex
ALTER TABLE `Document` RENAME INDEX `Document_createdBy_fkey` TO `Document_createdBy_idx`;

-- RenameIndex
ALTER TABLE `Document` RENAME INDEX `Document_parentDocumentId_fkey` TO `Document_parentDocumentId_idx`;

-- RenameIndex
ALTER TABLE `DocumentComment` RENAME INDEX `DocumentComment_authorId_fkey` TO `DocumentComment_authorId_idx`;

-- RenameIndex
ALTER TABLE `DocumentPermission` RENAME INDEX `DocumentPermission_userId_fkey` TO `DocumentPermission_userId_idx`;

-- RenameIndex
ALTER TABLE `DocumentVersion` RENAME INDEX `DocumentVersion_editedBy_fkey` TO `DocumentVersion_editedBy_idx`;

-- RenameIndex
ALTER TABLE `Mention` RENAME INDEX `Mention_mentionedUserId_fkey` TO `Mention_mentionedUserId_idx`;

-- RenameIndex
ALTER TABLE `Mention` RENAME INDEX `Mention_messageId_fkey` TO `Mention_messageId_idx`;

-- RenameIndex
ALTER TABLE `Message` RENAME INDEX `Message_parentMessageId_fkey` TO `Message_parentMessageId_idx`;

-- RenameIndex
ALTER TABLE `Notification` RENAME INDEX `Notification_recipientId_fkey` TO `Notification_recipientId_idx`;

-- RenameIndex
ALTER TABLE `Organization` RENAME INDEX `Organization_ownerId_fkey` TO `Organization_ownerId_idx`;

-- RenameIndex
ALTER TABLE `OrganizationMember` RENAME INDEX `OrganizationMember_organizationId_fkey` TO `OrganizationMember_organizationId_idx`;

-- RenameIndex
ALTER TABLE `Reaction` RENAME INDEX `Reaction_userId_fkey` TO `Reaction_userId_idx`;

-- RenameIndex
ALTER TABLE `Session` RENAME INDEX `Session_userId_fkey` TO `Session_userId_idx`;

-- RenameIndex
ALTER TABLE `SprintTask` RENAME INDEX `SprintTask_taskId_fkey` TO `SprintTask_taskId_idx`;

-- RenameIndex
ALTER TABLE `Task` RENAME INDEX `Task_createdBy_fkey` TO `Task_createdBy_idx`;

-- RenameIndex
ALTER TABLE `TaskActivity` RENAME INDEX `TaskActivity_actorId_fkey` TO `TaskActivity_actorId_idx`;

-- RenameIndex
ALTER TABLE `TaskComment` RENAME INDEX `TaskComment_authorId_fkey` TO `TaskComment_authorId_idx`;

-- RenameIndex
ALTER TABLE `TaskLabel` RENAME INDEX `TaskLabel_labelId_fkey` TO `TaskLabel_labelId_idx`;

-- RenameIndex
ALTER TABLE `WorkspaceInvite` RENAME INDEX `WorkspaceInvite_invitedById_fkey` TO `WorkspaceInvite_invitedById_idx`;

-- RenameIndex
ALTER TABLE `WorkspaceInvite` RENAME INDEX `WorkspaceInvite_workspaceId_fkey` TO `WorkspaceInvite_workspaceId_idx`;

-- RenameIndex
ALTER TABLE `WorkspaceKnowledge` RENAME INDEX `WorkspaceKnowledge_workspaceId_fkey` TO `WorkspaceKnowledge_workspaceId_idx`;

-- RenameIndex
ALTER TABLE `WorkspaceMember` RENAME INDEX `WorkspaceMember_workspaceId_fkey` TO `WorkspaceMember_workspaceId_idx`;
