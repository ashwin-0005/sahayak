export const CREATE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    worker_id TEXT NOT NULL REFERENCES workers(id),
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('F','M','O')),
    village TEXT NOT NULL,
    phone TEXT,
    condition TEXT NOT NULL CHECK (condition IN ('hypertension','diabetes','tb','pregnancy')),
    language TEXT NOT NULL CHECK (language IN ('en','hi')),
    consent_given INTEGER NOT NULL CHECK (consent_given IN (0,1)),
    consent_at TEXT,
    next_visit_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    worker_id TEXT NOT NULL REFERENCES workers(id),
    visited_at TEXT NOT NULL,
    systolic INTEGER,
    diastolic INTEGER,
    sugar_mg_dl INTEGER,
    sugar_type TEXT CHECK (sugar_type IN ('fasting','random')),
    medicine_taken INTEGER CHECK (medicine_taken IN (0,1)),
    missed_doses INTEGER NOT NULL DEFAULT 0,
    symptoms TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('urgent','clinic','home')),
    reason_codes TEXT NOT NULL DEFAULT '[]',
    advice_key TEXT NOT NULL,
    -- 1 when the worker force-saved despite an implausible-reading warning
    override INTEGER NOT NULL DEFAULT 0 CHECK (override IN (0,1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  // Append-only audit trail: who wrote what, when. Never updated or deleted
  // by the app — the answer to "who recorded this reading?".
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor_worker_id TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
  )`,
];

export const CREATE_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_patients_worker_updated ON patients(worker_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_patient_updated ON visits(patient_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_worker_updated ON visits(worker_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_patients_next_visit ON patients(worker_id, next_visit_date)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(table_name, record_id)`,
];

// Idempotent migrations for databases created before a column/table existed
// (IF NOT EXISTS never alters existing tables). Each statement is safe to
// re-run: failures mean "already applied" and are swallowed by the client.
export const MIGRATIONS: string[] = [
  // visits.override (plausibility-override flag) for pre-existing databases.
  // SQLite has no ADD COLUMN IF NOT EXISTS, so the duplicate-column error is
  // the "already migrated" signal.
  `ALTER TABLE visits ADD COLUMN override INTEGER NOT NULL DEFAULT 0 CHECK (override IN (0,1))`,
];
