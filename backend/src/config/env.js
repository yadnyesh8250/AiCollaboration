import { z } from "zod";
import { errorLogger, logger } from "../utils/logger.js";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().trim().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_REFRESH_SECRET: z.string().trim().min(8, "JWT_REFRESH_SECRET must be at least 8 characters"),
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
  PORT: z.string().optional().default("5000"),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional()
});

/**
 * Validates environment variables on startup.
 * Throws and exits fast if validation fails.
 */
export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    errorLogger.error("🛑 CRITICAL: Environment validation failed on startup.");
    result.error.errors.forEach((err) => {
      errorLogger.error(`  - Env Variable [${err.path.join(".")}]: ${err.message}`);
    });
    process.exit(1);
  }

  // Backwards compatibility mapping for REFRESH_SECRET in jwt.js
  if (!process.env.REFRESH_SECRET) {
    process.env.REFRESH_SECRET = result.data.JWT_REFRESH_SECRET;
  }

  logger.info("✅ Environment variables validated successfully.");
  return result.data;
};
