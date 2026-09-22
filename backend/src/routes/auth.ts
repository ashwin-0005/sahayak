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

router.post("/login", loginLimiter, validateBody(loginSchema), (req, res) => {
  const { workerId, pin } = req.body as { workerId: string; pin: string };
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
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid workerId or PIN" } });
    return;
  }
  const token = jwt.sign({ workerId: worker.id }, config.jwtSecret, { expiresIn: "12h" });
  res.json({ token, worker: { id: worker.id, name: worker.name, village: worker.village } });
});

export default router;
