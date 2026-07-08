import { Router } from "express";
import fs from "fs";
import path from "path";
import prisma from "../config/db.js";
import { redisClient, isRedisAvailable } from "../config/redis.js";

const router = Router();

// Read package version once on boot
let appVersion = "1.0.0";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  appVersion = pkg.version || "1.0.0";
} catch (err) {
  // Fallback
}

/**
 * GET /live
 * Simple liveness check. Always returns 200.
 */
router.get("/live", (req, res) => {
  return res.status(200).json({ status: "UP" });
});

/**
 * GET /ready
 * Readiness check. Verifies database and (optionally) Redis connections.
 */
router.get("/ready", async (req, res) => {
  let dbHealthy = false;
  let redisHealthy = false;

  // 1. Verify Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch (err) {
    dbHealthy = false;
  }

  // 2. Verify Redis (if configured and active)
  if (isRedisAvailable && redisClient) {
    try {
      const ping = await redisClient.ping();
      redisHealthy = ping === "PONG";
    } catch (err) {
      redisHealthy = false;
    }
  } else {
    // If Redis is intentionally fallback/disabled, we don't block readiness
    redisHealthy = true; 
  }

  if (dbHealthy && redisHealthy) {
    return res.status(200).json({ status: "READY" });
  }

  return res.status(503).json({
    status: "NOT_READY",
    details: {
      database: dbHealthy ? "UP" : "DOWN",
      redis: redisHealthy ? "UP" : "DOWN"
    }
  });
});

/**
 * GET /health
 * Detailed health metrics.
 */
router.get("/health", async (req, res) => {
  let dbStatus = "DOWN";
  let redisStatus = "DOWN";
  let geminiStatus = "DOWN";

  // Check DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "UP";
  } catch (err) {
    // leave as DOWN
  }

  // Check Redis
  if (isRedisAvailable && redisClient) {
    try {
      const ping = await redisClient.ping();
      if (ping === "PONG") dbStatus = "UP";
      redisStatus = "UP";
    } catch (err) {
      // leave as DOWN
    }
  } else {
    redisStatus = "FALLBACK_IN_MEMORY";
  }

  // Check Gemini Key presence
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5) {
    geminiStatus = "CONFIGURED";
  }

  const memory = process.memoryUsage();

  return res.status(200).json({
    status: dbStatus === "UP" ? "UP" : "DEGRADED",
    version: appVersion,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      gemini: geminiStatus
    },
    system: {
      memoryUsageMB: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024)
      }
    }
  });
});

export default router;
