import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { syncSchema } from "../schemas.js";
import { assessRisk } from "../services/riskEngine.js";
import { nextVisitDate } from "../services/followUp.js";

const router = Router();
router.use(authMiddleware);

function toPatientRow(p: Record<string, unknown>, workerId: string): Record<string, unknown> {
  return {
    id: p.id,
    worker_id: workerId,
    name: p.name,
    age: p.age,
    sex: p.sex,
    village: p.village,
    phone: (p.phone as string | null | undefined) ?? null,
    condition: p.condition,
    language: p.language,
    consent_given: p.consent_given,
    consent_at: (p.consent_at as string | null | undefined) ?? null,
    next_visit_date: (p.next_visit_date as string | null | undefined) ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
    deleted_at: (p.deleted_at as string | null | undefined) ?? null,
  };
}

router.post("/", validateBody(syncSchema), (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const { lastPulledAt, patients, visits } = req.body as {
    lastPulledAt: string | null;
    patients: Record<string, unknown>[];
    visits: Record<string, unknown>[];
  };
  const db = getDb();

  // Reject missing consent upfront
  const noConsent = (patients as { id: string; consent_given: unknown }[]).filter(
    (p) => p.consent_given !== 1 && p.consent_given !== true
  );
  if (noConsent.length > 0) {
    res.status(400).json({
      error: {
        code: "CONSENT_REQUIRED",
        message: "consent_given must be true for all patients",
        details: { ids: noConsent.map((p) => p.id) },
      },
    });
    return;
  }

  const now = new Date().toISOString();

  const txn = db.transaction(() => {
    for (const p of patients) {
      const row = toPatientRow(p, workerId);
      const existing = db.prepare("SELECT updated_at, worker_id FROM patients WHERE id = ?").get(row.id) as
        | { updated_at: string; worker_id: string }
        | undefined;
      if (existing) {
        if (existing.worker_id !== workerId) {
          throw Object.assign(new Error("Cross-worker write"), { status: 403, code: "FORBIDDEN" });
        }
        if ((existing.updated_at as string) >= (row.updated_at as string)) continue; // LWW: ignore older
        db.prepare(
          `UPDATE patients SET worker_id=?, name=?, age=?, sex=?, village=?, phone=?, "condition"=?, language=?, consent_given=?, consent_at=?, next_visit_date=?, created_at=?, updated_at=?, deleted_at=? WHERE id=?`
        ).run(
          row.worker_id, row.name, row.age, row.sex, row.village, row.phone, row.condition,
          row.language, row.consent_given, row.consent_at, row.next_visit_date,
          row.created_at, row.updated_at, row.deleted_at, row.id
        );
      } else {
        db.prepare(
          `INSERT INTO patients (id, worker_id, name, age, sex, village, phone, "condition", language, consent_given, consent_at, next_visit_date, created_at, updated_at, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(
          row.id, row.worker_id, row.name, row.age, row.sex, row.village, row.phone, row.condition,
          row.language, row.consent_given, row.consent_at, row.next_visit_date,
          row.created_at, row.updated_at, row.deleted_at
        );
      }
    }

    for (const v of visits) {
      const vid = v.id as string;
      const pid = v.patient_id as string;
      const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(pid) as
        | Record<string, unknown>
        | undefined;
      if (!patient) {
        throw Object.assign(new Error(`Patient ${pid} not found`), { status: 400, code: "UNKNOWN_PATIENT" });
      }
      if (patient.worker_id !== workerId) {
        throw Object.assign(new Error("Cross-worker write"), { status: 403, code: "FORBIDDEN" });
      }

      const existing = db.prepare("SELECT updated_at FROM visits WHERE id = ?").get(vid) as
        | { updated_at: string }
        | undefined;
      const incomingUpdated = v.updated_at as string;
      if (existing && existing.updated_at >= incomingUpdated) continue; // idempotent LWW

      // Recompute risk server-side — never trust client.
      const symptoms = Array.isArray(v.symptoms) ? (v.symptoms as string[]) : [];
      const risk = assessRisk({
        condition: patient.condition as "hypertension" | "diabetes" | "tb" | "pregnancy",
        age: patient.age as number,
        systolic: (v.systolic as number | null | undefined) ?? null,
        diastolic: (v.diastolic as number | null | undefined) ?? null,
        sugarMgDl: (v.sugar_mg_dl as number | null | undefined) ?? null,
        sugarType: (v.sugar_type as "fasting" | "random" | null | undefined) ?? null,
        medicineTaken:
          v.medicine_taken === 1 ? true : v.medicine_taken === 0 ? false : null,
        missedDoses: (v.missed_doses as number | undefined) ?? 0,
        symptoms,
      });

      const createdAt = (v.created_at as string | undefined) ?? incomingUpdated;
      const row = {
        id: vid,
        patient_id: pid,
        worker_id: workerId,
        visited_at: v.visited_at,
        systolic: (v.systolic as number | null | undefined) ?? null,
        diastolic: (v.diastolic as number | null | undefined) ?? null,
        sugar_mg_dl: (v.sugar_mg_dl as number | null | undefined) ?? null,
        sugar_type: (v.sugar_type as string | null | undefined) ?? null,
        medicine_taken: (v.medicine_taken as number | null | undefined) ?? null,
        missed_doses: (v.missed_doses as number | undefined) ?? 0,
        symptoms: JSON.stringify(symptoms),
        notes: (v.notes as string | null | undefined) ?? null,
        risk_level: risk.level,
        reason_codes: JSON.stringify(risk.reasonCodes),
        advice_key: risk.adviceKey,
        created_at: createdAt,
        updated_at: incomingUpdated,
      };

      if (existing) {
        db.prepare(
          `UPDATE visits SET patient_id=?, worker_id=?, visited_at=?, systolic=?, diastolic=?, sugar_mg_dl=?, sugar_type=?, medicine_taken=?, missed_doses=?, symptoms=?, notes=?, risk_level=?, reason_codes=?, advice_key=?, created_at=?, updated_at=? WHERE id=?`
        ).run(
          row.patient_id, row.worker_id, row.visited_at, row.systolic, row.diastolic,
          row.sugar_mg_dl, row.sugar_type, row.medicine_taken, row.missed_doses,
          row.symptoms, row.notes, row.risk_level, row.reason_codes, row.advice_key,
          row.created_at, row.updated_at, row.id
        );
      } else {
        db.prepare(
          `INSERT INTO visits (id, patient_id, worker_id, visited_at, systolic, diastolic, sugar_mg_dl, sugar_type, medicine_taken, missed_doses, symptoms, notes, risk_level, reason_codes, advice_key, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(
          row.id, row.patient_id, row.worker_id, row.visited_at, row.systolic, row.diastolic,
          row.sugar_mg_dl, row.sugar_type, row.medicine_taken, row.missed_doses,
          row.symptoms, row.notes, row.risk_level, row.reason_codes, row.advice_key,
          row.created_at, row.updated_at
        );
      }

      // Update patient's next visit date from this visit
      try {
        const next = nextVisitDate(row.visited_at as string, risk.nextVisitInDays);
        db.prepare("UPDATE patients SET next_visit_date=?, updated_at=? WHERE id=?").run(next, now, pid);
      } catch {
        // invalid visited_at already validated loosely; ignore scheduling failure
      }
    }
  });

  try {
    txn();
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string };
    const status = err.status ?? 500;
    res.status(status).json({ error: { code: err.code ?? "SYNC_FAILED", message: err.message ?? "Sync failed" } });
    return;
  }

  // Pull changes since lastPulledAt
  const since = lastPulledAt ?? "1970-01-01T00:00:00.000Z";
  const outPatients = db
    .prepare("SELECT * FROM patients WHERE worker_id = ? AND updated_at > ? ORDER BY updated_at ASC")
    .all(workerId, since);
  const outVisits = db
    .prepare("SELECT * FROM visits WHERE worker_id = ? AND updated_at > ? ORDER BY updated_at ASC")
    .all(workerId, since);

  res.json({ patients: outPatients, visits: outVisits, serverTime: now });
});

export default router;
