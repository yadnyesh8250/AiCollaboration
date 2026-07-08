/**
 * Generic Express validation middleware using Zod.
 * Parses and replaces req.body, req.query, or req.params with the validated/coerced data.
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `${e.path.join(".") || "field"}: ${e.message}`
    );
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors
    });
  }

  req[source] = result.data; // Replace request data with parsed/coerced values
  next();
};
