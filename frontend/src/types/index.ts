export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type ChannelType = "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT" | "AI";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "SYSTEM" | "AI";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskType = "TASK" | "BUG" | "EPIC" | "SUBTASK";
export type DocumentVisibility = "WORKSPACE" | "PRIVATE" | "PUBLIC";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl: string | null;
  status: "ONLINE" | "OFFLINE";
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPublic: boolean;
  orgId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  user: User;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: ChannelType;
  workspaceId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  messageType: MessageType;
  senderId: string;
  sender: User;
  channelId: string;
  parentMessageId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reactions: Reaction[];
  attachments: Attachment[];
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
  user: User;
}

export interface Attachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  messageId?: string;
  taskId?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assignedTo?: string;
  assignee?: User;
  workspaceId: string;
  sprintId?: string | null;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  startDate: string;
  endDate: string;
  workspaceId: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  workspaceId: string;
  parentDocumentId: string | null;
  visibility: DocumentVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentBlock {
  id: string;
  documentId: string;
  type: "HEADING" | "PARAGRAPH" | "LIST_ITEM" | "CODE" | "IMAGE";
  content: string;
  position: number;
  createdAt: string;
}
