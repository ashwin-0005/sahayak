import { z } from "zod";

export const loginSchema = z.object({
  workerId: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid ISO date");

export const patientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().min(0).max(130),
  sex: z.enum(["F", "M", "O"]),
  village: z.string().min(1),
  phone: z.string().nullable().optional(),
  condition: z.enum(["hypertension", "diabetes", "tb", "pregnancy"]),
  language: z.enum(["en", "hi"]),
  consent_given: z.union([z.boolean(), z.number()]).transform((v) => (v === true || v === 1 ? 1 : 0)),
  consent_at: z.string().nullable().optional(),
  next_visit_date: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
});

export const visitSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  visited_at: z.string(),
  // Physical plausibility clamps: beyond these no human reading is possible,
  // so reject outright (per-record INVALID_RECORD) instead of storing
  // garbage. In-range-but-odd values still pass and get IMPLAUSIBLE_READING.
  systolic: z.number().int().min(20).max(350).nullable().optional(),
  diastolic: z.number().int().min(10).max(250).nullable().optional(),
  sugar_mg_dl: z.number().int().min(10).max(1000).nullable().optional(),
  sugar_type: z.enum(["fasting", "random"]).nullable().optional(),
  medicine_taken: z.union([z.boolean(), z.number(), z.null()]).optional().transform((v) =>
    v === true || v === 1 ? 1 : v === false || v === 0 ? 0 : null
  ),
  missed_doses: z.number().int().min(0).max(60).default(0),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  // 1 when the worker force-saved despite an implausible-reading warning.
  override: z.union([z.boolean(), z.number()]).optional().transform((v) =>
    v === true || v === 1 ? 1 : 0
  ),
  // client-supplied risk is accepted but IGNORED server-side (recomputed)
  risk_level: z.enum(["urgent", "clinic", "home"]).optional(),
  reason_codes: z.array(z.string()).optional(),
  advice_key: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string(),
});

export const syncSchema = z.object({
  // nullish (not just nullable): fresh devices omit the key entirely
  // (JSON drops undefined), and that must mean "full pull", never 400.
  lastPulledAt: z.string().nullish(),
  // Rows are validated INDIVIDUALLY inside the route (per-record results),
  // so the envelope only checks shape: one bad row must never 400 the batch.
  patients: z.array(z.record(z.string(), z.unknown())).default([]),
  visits: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const patientsQuerySchema = z.object({
  search: z.string().optional(),
  condition: z.enum(["hypertension", "diabetes", "tb", "pregnancy"]).optional(),
});

export const dueQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export const riskAssessSchema = z.object({
  condition: z.enum(["hypertension", "diabetes", "tb", "pregnancy"]),
  age: z.number().int().min(0).max(130),
  systolic: z.number().min(20).max(350).nullable().optional(),
  diastolic: z.number().min(10).max(250).nullable().optional(),
  sugarMgDl: z.number().min(10).max(1000).nullable().optional(),
  sugarType: z.enum(["fasting", "random"]).nullable().optional(),
  medicineTaken: z.boolean().nullable().optional(),
  missedDoses: z.number().int().min(0).max(60).nullable().optional(),
  symptoms: z.array(z.string()).optional(),
});

export const reminderQuerySchema = z.object({
  lang: z.enum(["hi", "en"]).optional().default("en"),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type VisitInput = z.infer<typeof visitSchema>;
export { isoDate };
