export type Condition = "hypertension" | "diabetes" | "tb" | "pregnancy";
export type Sex = "F" | "M" | "O";
export type Language = "en" | "hi";
export type SugarType = "fasting" | "random";
export type RiskLevel = "urgent" | "clinic" | "home";
export type AdviceKey = "refer_urgent" | "visit_clinic_week" | "continue_home_care";

// Stored in Dexie in the same snake_case shape the backend uses, so sync maps 1:1.
export interface Patient {
  id: string;
  worker_id: string | null;
  name: string;
  age: number;
  sex: Sex;
  village: string;
  phone: string | null;
  condition: Condition;
  language: Language;
  consent_given: 1 | 0;
  consent_at: string | null;
  next_visit_date: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Locally `symptoms` and `reason_codes` are arrays. When pushing we keep arrays;
// when applying server rows we parse the JSON strings the backend returns.
export interface Visit {
  id: string;
  patient_id: string;
  worker_id: string | null;
  visited_at: string; // ISO-8601 UTC
  systolic: number | null;
  diastolic: number | null;
  sugar_mg_dl: number | null;
  sugar_type: SugarType | null;
  medicine_taken: 1 | 0 | null;
  missed_doses: number;
  symptoms: string[];
  notes: string | null;
  risk_level: RiskLevel;
  reason_codes: string[];
  advice_key: AdviceKey;
  // 1 when the worker force-saved despite an implausible-reading warning.
  // Audited server-side; null for visits created before this field existed.
  override: 1 | 0 | null;
  created_at: string;
  updated_at: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface Worker {
  id: string;
  name: string;
  village: string;
}

export interface SyncResult {
  patients: Patient[];
  visits: Visit[];
  serverTime: string;
  results?: RecordResult[];
}

// Per-record acknowledgement from POST /api/sync. `accepted` covers inserts,
// updates, and idempotent no-ops; only `accepted` rows may leave the outbox.
export interface RecordResult {
  table: "patients" | "visits";
  id: string;
  status: "accepted" | "rejected";
  code?: string;
  message?: string;
}

// A pushed record the server refused (or that was corrupt locally). Kept
// visible in Settings ("Sync issues") so it never blocks the queue or
// vanishes silently. `record` is the parsed snapshot when available.
export interface QuarantineEntry {
  id?: number; // auto-increment
  table: "patients" | "visits";
  record: unknown;
  code: string;
  message: string;
  created_at: string;
}

export type SyncStatus = "idle" | "syncing" | "offline" | "error";