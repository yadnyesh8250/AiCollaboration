import { z } from "zod";

const sprintStatusEnum = z.enum(["PLANNED", "ACTIVE", "COMPLETED"]);

export const createSprintSchema = z.object({
  name: z.string().trim().min(1, "Sprint name is required").max(100, "Sprint name is too long"),
  goal: z.string().trim().optional().nullable(),
  startDate: z.string().datetime({ precision: 3, offset: true }).or(z.string().transform(v => new Date(v).toISOString())),
  endDate: z.string().datetime({ precision: 3, offset: true }).or(z.string().transform(v => new Date(v).toISOString()))
});

export const updateSprintSchema = z.object({
  name: z.string().trim().min(1, "Sprint name cannot be empty").max(100).optional(),
  goal: z.string().trim().optional().nullable(),
  startDate: z.string().datetime({ precision: 3, offset: true }).or(z.string().transform(v => new Date(v).toISOString())).optional(),
  endDate: z.string().datetime({ precision: 3, offset: true }).or(z.string().transform(v => new Date(v).toISOString())).optional(),
  status: sprintStatusEnum.optional()
});
