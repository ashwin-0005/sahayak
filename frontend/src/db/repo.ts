import { db } from "./db.js";
import type { Patient, Visit } from "../types";
import { newId } from "../lib/ids";

const nowIso = (): string => new Date().toISOString();

// --- server-shape helpers -------------------------------------------------

function toServerPatient(p: Patient): Record<string, unknown> {
  const { worker_id: _discard, ...rest } = p;
  return { ...rest };
}

function toServerVisit(v: Visit): Record<string, unknown> {
  const { worker_id: _discard, ...rest } = v;
  return rest;
}

function enqueue(table: "patients" | "visits", record: unknown): Promise<void> {
  return db.outbox.add({
    table,
    record: JSON.stringify(record),
    created_at: nowIso()
  }).then(() => undefined);
}

// --- local IDs / timestamps ----------------------------------------------

export function now(): string {
  return nowIso();
}

// --- patients -------------------------------------------------------------

export async function savePatient(p: Patient): Promise<void> {
  const snap = toServerPatient(p);
  const patch = { ...p, updated_at: nowIso() };
  await db.transaction("rw", db.patients, db.outbox, async () => {
    const existing = await db.patients.get(p.id);
    if (existing && existing.updated_at >= patch.updated_at) {
      return; // never let local writes overwrite a newer synced record
    }
    await db.patients.put({ ...patch, deleted_at: p.deleted_at ?? null });
    await enqueue("patients", { ...snap, updated_at: patch.updated_at });
  });
}

export async function createPatient(p: Patient): Promise<void> {
  const nowIsoT = nowIso();
  await db.transaction("rw", db.patients, db.outbox, async () => {
    await db.patients.put({ ...p, created_at: nowIsoT, updated_at: nowIsoT, deleted_at: null, worker_id: null });
    await enqueue("patients", toServerPatient({ ...p, created_at: nowIsoT, updated_at: nowIsoT }));
  });
}

// Save a visit AND roll the patient's next_visit_date forward, both enqueued.
// `visitInput` already carries locally-computed risk fields; `nextVisitDate` is
// YYYY-MM-DD computed by the caller from the risk result.
export async function recordVisit(
  patient: Patient,
  visitInput: Visit,
  nextVisitDate: string
): Promise<{ patient: Patient; visit: Visit }> {
  const t = nowIso();
  const visitWithTs: Visit = { ...visitInput, created_at: t, updated_at: t };
  const patientPatch: Patient = { ...patient, next_visit_date: nextVisitDate, updated_at: t };

  await db.transaction("rw", db.visits, db.patients, db.outbox, async () => {
    await db.visits.put(visitWithTs);
    await enqueue("visits", toServerVisit(visitWithTs));
    await db.patients.put(patientPatch);
    await enqueue("patients", toServerPatient(patientPatch));
  });

  return { patient: patientPatch, visit: visitWithTs };
}

// --- reads ----------------------------------------------------------------

export async function getAllPatients(): Promise<Patient[]> {
  return (await db.patients.toArray()).filter((p) => p.deleted_at === null);
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const p = await db.patients.get(id);
  return p && p.deleted_at === null ? p : undefined;
}

export async function getVisitsForPatient(patientId: string): Promise<Visit[]> {
  return db.visits.where("patient_id").equals(patientId).sortBy("visited_at");
}

export async function getLastRiskForPatient(patientId: string): Promise<Visit | undefined> {
  const visits = await db.visits.where("patient_id").equals(patientId).toArray();
  if (visits.length === 0) return undefined;
  return visits.sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1))[0];
}

// --- server pull / LWW -----------------------------------------------------

export async function applyPatientFromServer(rec: Patient): Promise<void> {
  if (!rec.id) return;
  const local = await db.patients.get(rec.id);
  if (local && local.updated_at > rec.updated_at) return; // keep newer local
  await db.patients.put({ ...rec, deleted_at: rec.deleted_at ?? null });
}

export async function applyVisitFromServer(rec: Visit): Promise<void> {
  if (!rec.id) return;
  const local = await db.visits.get(rec.id);
  if (local && local.updated_at > rec.updated_at) return; // keep newer local
  await db.visits.put(rec);
}

// --- outbox ----------------------------------------------------------------

export async function getPendingOutbox() {
  return db.outbox.orderBy("id").toArray();
}

export async function clearOutbox(): Promise<void> {
  await db.outbox.clear();
}

// --- meta ------------------------------------------------------------------

export async function getMeta(key: string): Promise<unknown> {
  const row = await db.meta.get(key);
  return row?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  await db.meta.delete(key);
}

// --- maintenance -----------------------------------------------------------

// Reset demo data: wipe local clinical data, keep meta (token/worker/pin).
export async function resetLocalData(): Promise<void> {
  await db.transaction("rw", db.patients, db.visits, db.outbox, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
  });
}

export { newId };