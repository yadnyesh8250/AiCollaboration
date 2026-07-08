import { z } from "zod";

const documentVisibilityEnum = z.enum(["PUBLIC", "WORKSPACE", "PRIVATE"]);
const documentBlockTypeEnum = z.enum([
  "HEADING",
  "PARAGRAPH",
  "CHECKLIST",
  "CODE",
  "QUOTE",
  "TABLE",
  "IMAGE",
  "DIVIDER"
]);

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "Document title is required").max(200, "Document title is too long"),
  visibility: documentVisibilityEnum.default("WORKSPACE"),
  parentDocumentId: z.string().uuid().optional().nullable()
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1, "Document title cannot be empty").max(200).optional(),
  visibility: documentVisibilityEnum.optional(),
  icon: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable()
});

export const blockSchema = z.object({
  id: z.string().optional(),
  type: documentBlockTypeEnum.default("PARAGRAPH"),
  content: z.string().default(""),
  position: z.number().default(1000.0).or(z.string().transform(v => parseFloat(v)).pipe(z.number()).default(1000.0))
});

export const bulkUpdateBlocksSchema = z.object({
  blocks: z.array(blockSchema)
});

export const documentPermissionSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  role: z.enum(["OWNER", "EDITOR", "COMMENTER", "VIEWER"])
});
