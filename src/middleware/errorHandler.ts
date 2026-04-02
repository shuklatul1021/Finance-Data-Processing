import type { ErrorRequestHandler } from "express";

import { HttpError } from "../lib/httpError.js";

interface PgLikeError {
  code?: string;
  detail?: string;
}

const isPgLikeError = (value: unknown): value is PgLikeError => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "code" in value;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (isPgLikeError(error)) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "A record with the same unique value already exists.",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: "A referenced record does not exist.",
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    error: "Unexpected server error.",
  });
};
