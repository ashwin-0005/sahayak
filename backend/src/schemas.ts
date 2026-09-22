import { z } from "zod";

export const loginSchema = z.object({
  workerId: z.string().min(1),
  pin: z.string().min(1),
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
  systolic: z.number().int().nullable().optional(),
  diastolic: z.number().int().nullable().optional(),
  sugar_mg_dl: z.number().int().nullable().optional(),
  sugar_type: z.enum(["fasting", "random"]).nullable().optional(),
  medicine_taken: z.union([z.boolean(), z.number(), z.null()]).optional().transform((v) =>
    v === true || v === 1 ? 1 : v === false || v === 0 ? 0 : null
  ),
  missed_doses: z.number().int().min(0).default(0),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  // client-supplied risk is accepted but IGNORED server-side (recomputed)
  risk_level: z.enum(["urgent", "clinic", "home"]).optional(),
  reason_codes: z.array(z.string()).optional(),
  advice_key: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string(),
});

export const syncSchema = z.object({
  lastPulledAt: z.string().nullable(),
  patients: z.array(patientSchema).default([]),
  visits: z.array(visitSchema).default([]),
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
  systolic: z.number().nullable().optional(),
  diastolic: z.number().nullable().optional(),
  sugarMgDl: z.number().nullable().optional(),
  sugarType: z.enum(["fasting", "random"]).nullable().optional(),
  medicineTaken: z.boolean().nullable().optional(),
  missedDoses: z.number().int().min(0).nullable().optional(),
  symptoms: z.array(z.string()).optional(),
});

export const reminderQuerySchema = z.object({
  lang: z.enum(["hi", "en"]).optional().default("en"),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type VisitInput = z.infer<typeof visitSchema>;
export { isoDate };
