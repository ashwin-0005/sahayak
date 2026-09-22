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
}

export type SyncStatus = "idle" | "syncing" | "offline" | "error";