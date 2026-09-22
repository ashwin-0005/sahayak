import Dexie, { type EntityTable } from "dexie";
import type { MetaRow, Patient, QuarantineEntry, Visit } from "../types";

export interface OutboxEntry {
  id?: number; // auto-increment
  table: "patients" | "visits";
  record: string; // JSON snapshot of the record to push
  created_at: string;
}

// All local data lives in IndexedDB via Dexie. localStorage is only used for
// tiny UI prefs (language). Patients/visits never go to localStorage.
export const db = new Dexie("sahayak") as Dexie & {
  patients: EntityTable<Patient, "id">;
  visits: EntityTable<Visit, "id">;
  outbox: EntityTable<OutboxEntry, "id">;
  quarantine: EntityTable<QuarantineEntry, "id">;
  meta: EntityTable<MetaRow, "key">;
};

db.version(1).stores({
  patients: "id, worker_id, updated_at, next_visit_date, condition, deleted_at",
  visits: "id, patient_id, updated_at, visited_at",
  outbox: "++id, table, created_at",
  meta: "key"
});

// v2 adds the quarantine table: records the server refused (or that were
// corrupt locally) so they stay visible instead of blocking sync or
// vanishing. No data migration needed — new table starts empty.
db.version(2).stores({
  patients: "id, worker_id, updated_at, next_visit_date, condition, deleted_at",
  visits: "id, patient_id, updated_at, visited_at",
  outbox: "++id, table, created_at",
  quarantine: "++id, table, created_at",
  meta: "key"
});

// If another tab holds an older version open, our upgrade would block
// forever (stuck "Loading..." on the route guard). Close on versionchange so
// the upgrade — and the waiting tab — can proceed.
db.on("versionchange", () => {
  db.close();
});