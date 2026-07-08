import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient, isRedisAvailable } from "../config/redis.js";

/**
 * Generates store options for express-rate-limit.
 * Uses Redis if connected, otherwise defaults to MemoryStore.
 */
const getLimiterStore = (prefix) => {
  if (isRedisAvailable && redisClient) {
    return new RedisStore({
      // We pass direct Redis call method
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rate-limit:${prefix}:`
    });
  }
  return undefined; // Default in-memory store
};

/**
 * Rate limiter for authentication routes.
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  store: getLimiterStore("auth"),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 5 minutes."
  }
});

/**
 * Rate limiter for generative AI routes.
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  store: getLimiterStore("ai"),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests. Please try again after a minute."
  }
});
