import Redis from "ioredis";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy(times) {
      if (times > 2) {
        isRedisAvailable = false;
        logger.warn("[Redis] Local server is unreachable. Gracefully falling back to in-memory mode.");
        return null; // Stop retrying
      }
      return 500;
    }
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    logger.info("⚡ [Redis] Connected successfully.");
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    // Log as warning rather than error to avoid crash alerts during local dev/tests
    logger.warn(`[Redis] Connection warning: ${err.message}`);
  });
} catch (err) {
  isRedisAvailable = false;
  logger.warn(`[Redis] Failed to initialize: ${err.message}`);
}

/**
 * Helper to spawn separate Redis connection instances (e.g. for Socket.io Pub/Sub adapter)
 */
export const createRedisConnection = () => {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000
  });
};

export { redisClient, isRedisAvailable };
export default redisClient;
