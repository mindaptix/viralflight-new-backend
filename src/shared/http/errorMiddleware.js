import { AppError } from "../errors/AppError.js";

export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    const extra =
      error.details && typeof error.details === "object" && !Array.isArray(error.details)
        ? error.details
        : error.details
          ? { details: error.details }
          : {};

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...extra,
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate record",
    });
  }

  if (error?.status === 429 || error?.code === 20429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a few minutes and try again.",
    });
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: error?.message || "Internal server error",
  });
};
