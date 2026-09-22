import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { config } from "../config.js";
import { getDb } from "../db/client.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema } from "../schemas.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many login attempts, try later" } },
});

// Per-account lockout: the IP limiter alone can't stop distributed guessing.
// After MAX failures for one workerId, that account refuses logins for a
// while even with the right PIN. Single-instance in-memory store: on a
// multi-instance deploy this must move to shared storage (Redis/DB).
const MAX_ACCOUNT_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000;
const accountFailures = new Map<string, { count: number; lockedUntil: number }>();

// Test hook: the suite shares one process, so tests reset lockout state.
export function resetLoginLockout(): void {
  accountFailures.clear();
}

function accountLocked(workerId: string): boolean {
  const entry = accountFailures.get(workerId);
  if (!entry || entry.count < MAX_ACCOUNT_ATTEMPTS) return false;
  if (Date.now() >= entry.lockedUntil) {
    accountFailures.delete(workerId); // lockout expired, fresh start
    return false;
  }
  return true;
}

function recordFailure(workerId: string): void {
  const entry = accountFailures.get(workerId) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ACCOUNT_ATTEMPTS) {
    entry.lockedUntil = Date.now() + ACCOUNT_LOCKOUT_MS;
  }
  accountFailures.set(workerId, entry);
}

router.post("/login", loginLimiter, validateBody(loginSchema), (req, res) => {
  const { workerId, pin } = req.body as { workerId: string; pin: string };
  if (accountLocked(workerId)) {
    res.status(429).json({ error: { code: "ACCOUNT_LOCKED", message: "Too many wrong attempts, try later" } });
    return;
  }
  const db = getDb();
  const worker = db
    .prepare("SELECT id, name, village, pin_hash FROM workers WHERE id = ?")
    .get(workerId) as { id: string; name: string; village: string; pin_hash: string } | undefined;
  if (!worker) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid workerId or PIN" } });
    return;
  }
  const ok = bcrypt.compareSync(pin, worker.pin_hash);
  if (!ok) {
    recordFailure(workerId);
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid workerId or PIN" } });
    return;
  }
  accountFailures.delete(workerId);
  const token = jwt.sign({ workerId: worker.id }, config.jwtSecret, { expiresIn: "12h" });
  res.json({ token, worker: { id: worker.id, name: worker.name, village: worker.village } });
});

export default router;
