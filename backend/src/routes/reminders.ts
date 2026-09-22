import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { buildReminder, type ReminderKind } from "../services/reminderTemplates.js";

const router = Router();
router.use(authMiddleware);

router.get("/:patientId", (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const lang = (req.query.lang as string) === "hi" ? "hi" : "en";
  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.patientId) as
    | Record<string, unknown>
    | undefined;
  if (!patient || patient.worker_id !== workerId || patient.deleted_at) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Patient not found" } });
    return;
  }
  const phone = (patient.phone as string | null) ?? "";
  if (!phone) {
    res.status(400).json({ error: { code: "MISSING_PHONE", message: "Patient has no phone number" } });
    return;
  }
  const worker = db.prepare("SELECT name FROM workers WHERE id = ?").get(workerId) as
    | { name: string }
    | undefined;
  const last = db
    .prepare("SELECT risk_level FROM visits WHERE patient_id = ? ORDER BY visited_at DESC LIMIT 1")
    .get(req.params.patientId) as { risk_level: string } | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = (patient.next_visit_date as string | null) ?? today;
  let kind: ReminderKind = "routine";
  if (last?.risk_level === "urgent") kind = "urgent";
  else if (dueDate < today) kind = "missed";

  const { message, whatsappUrl, smsUrl } = buildReminder(kind, lang, {
    patientName: patient.name as string,
    dueDate,
    workerName: worker?.name ?? "health worker",
    phone,
  });
  res.json({ message, whatsappUrl, smsUrl, kind, lang });
});

export default router;
