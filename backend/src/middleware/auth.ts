import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthRequest extends Request {
  workerId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing bearer token" } });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { workerId: string };
    req.workerId = payload.workerId;
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
