import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

// Redact PII (names, phones) from logs — never log request bodies containing them.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : "Internal server error";
  if (!config.isProd) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: config.isProd ? "Internal server error" : message,
    },
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
