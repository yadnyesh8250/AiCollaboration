import { errorLogger } from "../utils/logger.js";

/**
 * Global error handler middleware.
 * Ensures consistent error JSON response structure across all APIs.
 */
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error.";

  errorLogger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        ...err
      },
      path: req.path,
      method: req.method,
      ip: req.ip
    },
    "Centralized error handler caught exception"
  );

  return res.status(status).json({
    success: false,
    message
  });
};
