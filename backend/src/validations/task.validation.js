import { z } from "zod";

const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED", "CANCELLED"]);
const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const taskTypeEnum = z.enum(["TASK", "BUG", "FEATURE", "EPIC", "STORY", "SUBTASK"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200, "Task title is too long"),
  description: z.string().trim().optional().nullable(),
  status: taskStatusEnum.default("TODO"),
  priority: taskPriorityEnum.default("MEDIUM"),
  type: taskTypeEnum.default("TASK"),
  assignedTo: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime({ precision: 3, offset: true }).optional().nullable().or(z.string().optional().nullable()),
  dueDate: z.string().datetime({ precision: 3, offset: true }).optional().nullable().or(z.string().optional().nullable()),
  estimatedHours: z.number().nonnegative().optional().nullable().or(z.string().transform(v => parseFloat(v)).pipe(z.number().nonnegative()).optional().nullable()),
  actualHours: z.number().nonnegative().optional().nullable().or(z.string().transform(v => parseFloat(v)).pipe(z.number().nonnegative()).optional().nullable()),
  position: z.number().optional().default(1000.0).or(z.string().transform(v => parseFloat(v)).pipe(z.number()).optional().default(1000.0))
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title cannot be empty").max(200).optional(),
  description: z.string().trim().optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  type: taskTypeEnum.optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime({ precision: 3, offset: true }).optional().nullable().or(z.string().optional().nullable()),
  dueDate: z.string().datetime({ precision: 3, offset: true }).optional().nullable().or(z.string().optional().nullable()),
  estimatedHours: z.number().nonnegative().optional().nullable().or(z.string().transform(v => parseFloat(v)).pipe(z.number().nonnegative()).optional().nullable()),
  actualHours: z.number().nonnegative().optional().nullable().or(z.string().transform(v => parseFloat(v)).pipe(z.number().nonnegative()).optional().nullable()),
  position: z.number().optional().or(z.string().transform(v => parseFloat(v)).pipe(z.number()).optional())
});

export const taskCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment content is required").max(10000, "Comment is too long")
});
