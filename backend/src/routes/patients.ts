import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { patientsQuerySchema } from "../schemas.js";

const router = Router();
router.use(authMiddleware);

router.get("/", validateQuery(patientsQuerySchema), (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const { search, condition } = req.query as { search?: string; condition?: string };
  const db = getDb();
  let sql = "SELECT * FROM patients WHERE worker_id = ? AND deleted_at IS NULL";
  const params: unknown[] = [workerId];
  if (condition) {
    sql += ` AND "condition" = ?`;
    params.push(condition);
  }
  if (search) {
    sql += " AND (name LIKE ? OR village LIKE ? OR phone LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY updated_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json({ patients: rows });
});

router.get("/:id", (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!patient || patient.worker_id !== workerId || patient.deleted_at) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Patient not found" } });
    return;
  }
  const visits = db
    .prepare("SELECT * FROM visits WHERE patient_id = ? ORDER BY visited_at ASC")
    .all(req.params.id);
  res.json({ patient, visits });
});

export default router;
