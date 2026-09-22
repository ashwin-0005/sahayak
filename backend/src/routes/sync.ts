import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { patientSchema, syncSchema, visitSchema } from "../schemas.js";
import { assessRisk } from "../services/riskEngine.js";
import { nextVisitDate } from "../services/followUp.js";

const router = Router();
router.use(authMiddleware);

export interface RecordResult {
  table: "patients" | "visits";
  id: string;
  status: "accepted" | "rejected";
  code?: string;
  message?: string;
}

// --- timestamp plausibility (M9) -------------------------------------------
// Client clocks in the field skew. Absurd timestamps would permanently win or
// lose last-write-wins conflicts, so reject them per record instead of
// trusting them verbatim. Allows 5 minutes of future skew for clock drift.
const MIN_TIMESTAMP_MS = Date.parse("2020-01-01T00:00:00.000Z");
const FUTURE_SKEW_ALLOWANCE_MS = 5 * 60 * 1000;

function timestampProblem(value: unknown, nowMs: number): string | null {
  if (typeof value !== "string") return "must be an ISO timestamp string";
  const t = Date.parse(value);
  if (Number.isNaN(t)) return "unparseable timestamp";
  if (t < MIN_TIMESTAMP_MS) return "timestamp predates 2020, likely a device clock error";
  if (t > nowMs + FUTURE_SKEW_ALLOWANCE_MS) return "timestamp is in the future, likely a device clock error";
  return null;
}

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

// Append-only audit: every accepted write records actor + record + time.
// Only called for rows that actually changed (not LWW no-ops).
function audit(
  db: ReturnType<typeof getDb>,
  actor: string,
  action: string,
  table: string,
  recordId: string,
  detail: Record<string, unknown> | null,
  now: string
): void {
  db.prepare(
    "INSERT INTO audit_log (id, actor_worker_id, action, table_name, record_id, detail, created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(randomUUID(), actor, action, table, recordId, detail ? JSON.stringify(detail) : null, now);
}
// The client mirrors this (local wins only when strictly newer), so ties
// converge deterministically instead of flapping between devices.
// Tiebreak policy (documented): on equal updated_at the SERVER row wins.
// The client mirrors this (local wins only when strictly newer), so ties
// converge deterministically instead of flapping between devices.
function applyPatient(db: ReturnType<typeof getDb>, p: Record<string, unknown>, workerId: string, now: string): void {
  const row = toPatientRow(p, workerId);
  const existing = db.prepare("SELECT updated_at, worker_id FROM patients WHERE id = ?").get(row.id) as
    | { updated_at: string; worker_id: string }
    | undefined;
  if (existing) {
    if (existing.worker_id !== workerId) {
      throw Object.assign(new Error("Cross-worker write"), { status: 403, code: "FORBIDDEN" });
    }
    if ((existing.updated_at as string) >= (row.updated_at as string)) return; // LWW: ignore older-or-equal
    db.prepare(
      `UPDATE patients SET worker_id=?, name=?, age=?, sex=?, village=?, phone=?, "condition"=?, language=?, consent_given=?, consent_at=?, next_visit_date=?, created_at=?, updated_at=?, deleted_at=? WHERE id=?`
    ).run(
      row.worker_id, row.name, row.age, row.sex, row.village, row.phone, row.condition,
      row.language, row.consent_given, row.consent_at, row.next_visit_date,
      row.created_at, row.updated_at, row.deleted_at, row.id
    );
    audit(db, workerId, "update", "patients", row.id as string, { updated_at: row.updated_at }, now);
  } else {
    db.prepare(
      `INSERT INTO patients (id, worker_id, name, age, sex, village, phone, "condition", language, consent_given, consent_at, next_visit_date, created_at, updated_at, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id, row.worker_id, row.name, row.age, row.sex, row.village, row.phone, row.condition,
      row.language, row.consent_given, row.consent_at, row.next_visit_date,
      row.created_at, row.updated_at, row.deleted_at
    );
    audit(db, workerId, "insert", "patients", row.id as string, { updated_at: row.updated_at }, now);
  }
}

function applyVisit(
  db: ReturnType<typeof getDb>,
  v: Record<string, unknown>,
  workerId: string,
  now: string
): void {
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
  if (existing && existing.updated_at >= incomingUpdated) return; // idempotent LWW

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
  const override = v.override === 1 || v.override === true ? 1 : 0;
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
    override,
    created_at: createdAt,
    updated_at: incomingUpdated,
  };

  if (existing) {
    db.prepare(
      `UPDATE visits SET patient_id=?, worker_id=?, visited_at=?, systolic=?, diastolic=?, sugar_mg_dl=?, sugar_type=?, medicine_taken=?, missed_doses=?, symptoms=?, notes=?, risk_level=?, reason_codes=?, advice_key=?, override=?, created_at=?, updated_at=? WHERE id=?`
    ).run(
      row.patient_id, row.worker_id, row.visited_at, row.systolic, row.diastolic,
      row.sugar_mg_dl, row.sugar_type, row.medicine_taken, row.missed_doses,
      row.symptoms, row.notes, row.risk_level, row.reason_codes, row.advice_key,
      row.override, row.created_at, row.updated_at, row.id
    );
    audit(db, workerId, "update", "visits", vid, { risk_level: risk.level, override }, now);
  } else {
    db.prepare(
      `INSERT INTO visits (id, patient_id, worker_id, visited_at, systolic, diastolic, sugar_mg_dl, sugar_type, medicine_taken, missed_doses, symptoms, notes, risk_level, reason_codes, advice_key, override, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id, row.patient_id, row.worker_id, row.visited_at, row.systolic, row.diastolic,
      row.sugar_mg_dl, row.sugar_type, row.medicine_taken, row.missed_doses,
      row.symptoms, row.notes, row.risk_level, row.reason_codes, row.advice_key,
      row.override, row.created_at, row.updated_at
    );
    audit(db, workerId, "insert", "visits", vid, { risk_level: risk.level, override }, now);
  }

  // Update patient's next visit date from this visit
  try {
    const next = nextVisitDate(row.visited_at as string, risk.nextVisitInDays);
    db.prepare("UPDATE patients SET next_visit_date=?, updated_at=? WHERE id=?").run(next, now, pid);
  } catch {
    // invalid visited_at already validated loosely; ignore scheduling failure
  }
}

// Per-record sync: every pushed row is validated and applied independently.
// One bad row is reported in `results` and quarantined client-side; it never
// blocks the rest of the batch (previously a single failure rolled back
// everything and retried forever).
router.post("/", validateBody(syncSchema), (req, res) => {
  const workerId = (req as AuthRequest).workerId as string;
  const { lastPulledAt, patients, visits } = req.body as {
    lastPulledAt: string | null | undefined;
    patients: Record<string, unknown>[];
    visits: Record<string, unknown>[];
  };
  const db = getDb();
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const results: RecordResult[] = [];

  const reject = (table: "patients" | "visits", id: string, code: string, message: string): void => {
    results.push({ table, id, status: "rejected", code, message });
  };

  for (const raw of patients) {
    const id = typeof raw?.id === "string" ? raw.id : "(missing id)";
    const parsed = patientSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean).join(", ");
      reject("patients", id, "INVALID_RECORD", `Patient failed validation${fields ? ` (${fields})` : ""}`);
      continue;
    }
    const p = parsed.data as unknown as Record<string, unknown>;
    const tsProblem = timestampProblem(p.updated_at, nowMs);
    if (tsProblem) {
      reject("patients", id, "INVALID_TIMESTAMP", `Patient updated_at ${tsProblem}`);
      continue;
    }
    if (p.consent_given !== 1 && p.consent_given !== true) {
      reject("patients", id, "CONSENT_REQUIRED", "consent_given must be true");
      continue;
    }
    try {
      db.transaction(() => applyPatient(db, { ...p, consent_given: 1 }, workerId, now))();
      results.push({ table: "patients", id, status: "accepted" });
    } catch (e: unknown) {
      const err = e as { status?: number; code?: string; message?: string };
      reject("patients", id, err.code ?? "SYNC_FAILED", err.message ?? "Sync failed");
    }
  }

  for (const raw of visits) {
    const id = typeof raw?.id === "string" ? raw.id : "(missing id)";
    const parsed = visitSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean).join(", ");
      reject("visits", id, "INVALID_RECORD", `Visit failed validation${fields ? ` (${fields})` : ""}`);
      continue;
    }
    const v = parsed.data as unknown as Record<string, unknown>;
    const tsProblem = timestampProblem(v.updated_at, nowMs) ?? timestampProblem(v.visited_at, nowMs);
    if (tsProblem) {
      reject("visits", id, "INVALID_TIMESTAMP", `Visit timestamp ${tsProblem}`);
      continue;
    }
    try {
      db.transaction(() => applyVisit(db, v, workerId, now))();
      results.push({ table: "visits", id, status: "accepted" });
    } catch (e: unknown) {
      const err = e as { status?: number; code?: string; message?: string };
      reject("visits", id, err.code ?? "SYNC_FAILED", err.message ?? "Sync failed");
    }
  }

  // Pull changes since lastPulledAt. An unparsable cursor can never mean "give
  // me less data", so coerce it to the epoch (full pull) rather than failing.
  const since = typeof lastPulledAt === "string" && !Number.isNaN(Date.parse(lastPulledAt))
    ? lastPulledAt
    : "1970-01-01T00:00:00.000Z";
  const outPatients = db
    .prepare("SELECT * FROM patients WHERE worker_id = ? AND updated_at > ? ORDER BY updated_at ASC")
    .all(workerId, since);
  const outVisits = db
    .prepare("SELECT * FROM visits WHERE worker_id = ? AND updated_at > ? ORDER BY updated_at ASC")
    .all(workerId, since);

  res.json({ patients: outPatients, visits: outVisits, serverTime: now, results });
});

export default router;
