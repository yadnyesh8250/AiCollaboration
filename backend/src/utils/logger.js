import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
    : undefined
});

// Explicit category loggers for production observability
export const httpLogger = logger.child({ category: "http" });
export const workerLogger = logger.child({ category: "worker" });
export const aiLogger = logger.child({ category: "ai" });
export const socketLogger = logger.child({ category: "socket" });
export const errorLogger = logger.child({ category: "error" });

export default logger;
