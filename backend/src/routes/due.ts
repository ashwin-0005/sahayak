import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { dueQuerySchema } from "../schemas.js";
import { daysOverdue } from "../services/followUp.js";

const router = Router();
router.use(authMiddleware);

const RANK: Record<string, number> = { urgent: 0, clinic: 1, home: 2 };

router.get("/", validateQuery(dueQuerySchema), (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const { date } = req.query as { date: string };
  const db = getDb();
  const patients = db
    .prepare(
      `SELECT * FROM patients WHERE worker_id = ? AND deleted_at IS NULL AND next_visit_date IS NOT NULL AND next_visit_date <= ?`
    )
    .all(workerId, date) as Record<string, unknown>[];

  const out = patients.map((p) => {
    const last = db
      .prepare("SELECT risk_level FROM visits WHERE patient_id = ? ORDER BY visited_at DESC LIMIT 1")
      .get(p.id) as { risk_level: string } | undefined;
    const lastRiskLevel = last?.risk_level ?? null;
    return {
      ...p,
      daysOverdue: daysOverdue(p.next_visit_date as string, date),
      lastRiskLevel,
    };
  });

  out.sort((a, b) => {
    const ra = RANK[(a.lastRiskLevel as string) ?? "home"] ?? 2;
    const rb = RANK[(b.lastRiskLevel as string) ?? "home"] ?? 2;
    if (ra !== rb) return ra - rb;
    return (b.daysOverdue as number) - (a.daysOverdue as number);
  });

  res.json({ date, patients: out });
});

export default router;
