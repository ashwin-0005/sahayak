import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// Minimal visits reader (writes go through /api/sync for offline-first idempotency)
router.get("/", (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const patientId = req.query.patient_id as string | undefined;
  const db = getDb();
  if (patientId) {
    const patient = db.prepare("SELECT worker_id FROM patients WHERE id = ?").get(patientId) as
      | { worker_id: string }
      | undefined;
    if (!patient || patient.worker_id !== workerId) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Patient not found" } });
      return;
    }
    const visits = db
      .prepare("SELECT * FROM visits WHERE patient_id = ? ORDER BY visited_at ASC")
      .all(patientId);
    res.json({ visits });
    return;
  }
  const visits = db
    .prepare("SELECT * FROM visits WHERE worker_id = ? ORDER BY visited_at DESC LIMIT 200")
    .all(workerId);
  res.json({ visits });
});

export default router;
