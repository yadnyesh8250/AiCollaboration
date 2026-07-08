import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_\-]+$/, "Username can only contain alphanumeric characters, underscores, and hyphens"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required")
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});
