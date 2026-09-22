// Risk engine — a faithful copy of the backend's PURE, DETERMINISTIC rules so
// the app works OFFLINE with identical thresholds and reason codes.
// The server always recomputes risk on sync; this copy just mirrors it locally.
//
// NOTE: thresholds below are DEMO values for a hackathon. They MUST be
// validated against current national guidelines before any real clinical use.
// Design principle: CONSERVATIVE. Missing / contradictory / uncertain data
// escalates to the SAFER option, never de-escalates.

import type { AdviceKey, Condition, RiskLevel } from "../types";

export interface RiskInput {
  condition: Condition;
  age: number;
  systolic?: number | null;
  diastolic?: number | null;
  sugarMgDl?: number | null;
  sugarType?: "fasting" | "random" | null;
  medicineTaken?: boolean | null;
  missedDoses?: number | null;
  symptoms?: string[];
}

export interface RiskResult {
  level: RiskLevel;
  reasonCodes: string[];
  adviceKey: AdviceKey;
  nextVisitInDays: number;
}

const DANGER_SYMPTOMS = new Set([
  "chest_pain",
  "breathlessness",
  "fainting",
  "confusion",
  "vomiting_blood",
  "coughing_blood"
]);

const PREG_DANGER_SIGNS = new Set([
  "severe_headache",
  "blurred_vision",
  "swelling_face",
  "bleeding",
  "reduced_fetal_movement",
  "convulsions"
]);

const DEFAULT_VISIT_DAYS: Record<Condition, number> = {
  hypertension: 30,
  diabetes: 30,
  tb: 7,
  pregnancy: 28
};

export function assessRisk(input: RiskInput): RiskResult {
  const codes: string[] = [];
  let severity = 0; // 0=home, 1=clinic, 2=urgent
  const escalate = (level: 1 | 2, code: string): void => {
    if (!codes.includes(code)) codes.push(code);
    if (level > severity) severity = level;
  };

  const {
    condition,
    systolic,
    diastolic,
    sugarMgDl,
    sugarType,
    medicineTaken,
    missedDoses,
    symptoms = []
  } = input;

  const hasSys = typeof systolic === "number" && !Number.isNaN(systolic);
  const hasDia = typeof diastolic === "number" && !Number.isNaN(diastolic);
  const hasSugar = typeof sugarMgDl === "number" && !Number.isNaN(sugarMgDl);
  const missed = typeof missedDoses === "number" ? missedDoses : 0;

  // --- 1. Input sanity (measurement error likely -> re-check at clinic) ---
  if (hasSys && (systolic < 50 || systolic > 300)) escalate(1, "IMPLAUSIBLE_READING");
  if (hasDia && (diastolic < 30 || diastolic > 200)) escalate(1, "IMPLAUSIBLE_READING");
  if (hasSugar && (sugarMgDl < 20 || sugarMgDl > 800)) escalate(1, "IMPLAUSIBLE_READING");
  if (hasSys && hasDia && systolic <= diastolic) escalate(1, "IMPLAUSIBLE_READING");

  // --- 2. Blood pressure ---
  if (condition === "pregnancy") {
    if (!hasSys && !hasDia) {
      escalate(1, "BP_MISSING");
    } else {
      const s = hasSys ? (systolic as number) : 0;
      const d = hasDia ? (diastolic as number) : 0;
      if ((hasSys && s >= 160) || (hasDia && d >= 110)) {
        escalate(2, "PREG_SEVERE_BP");
      } else if ((hasSys && s >= 140) || (hasDia && d >= 90)) {
        escalate(2, "PREG_HIGH_BP");
      }
      if (hasSys && s < 90) escalate(1, "BP_LOW");
      else if (hasDia && d < 60) escalate(1, "BP_LOW");
    }
    if (symptoms.some((s) => PREG_DANGER_SIGNS.has(s))) {
      escalate(2, "PREG_DANGER_SIGN");
    }
  } else {
    if (!hasSys && !hasDia) {
      if (condition === "hypertension") escalate(1, "BP_MISSING");
    } else {
      const s = hasSys ? (systolic as number) : -1;
      const d = hasDia ? (diastolic as number) : -1;
      const crisis = (hasSys && s >= 180) || (hasDia && d >= 120);
      const high = (hasSys && s >= 140) || (hasDia && d >= 90);
      const low = (hasSys && s < 90) || (hasDia && d < 60);
      if (crisis) escalate(2, "BP_CRISIS");
      else if (high) escalate(1, "BP_HIGH");
      if (low) escalate(1, "BP_LOW");
    }
  }

  // --- 3. Blood sugar (diabetes) ---
  if (condition === "diabetes") {
    if (!hasSugar) {
      escalate(1, "SUGAR_MISSING");
    } else {
      const v = sugarMgDl as number;
      if (v < 70) escalate(2, "HYPOGLYCEMIA");
      else if (v >= 300) escalate(2, "SUGAR_VERY_HIGH");
      else if (
        (sugarType === "random" && v >= 200) ||
        (sugarType === "fasting" && v >= 126) ||
        ((!sugarType || sugarType === null) && v >= 200)
      ) {
        escalate(1, "SUGAR_HIGH");
      }
    }
  } else if (hasSugar) {
    const v = sugarMgDl as number;
    if (v < 70) escalate(2, "HYPOGLYCEMIA");
    else if (v >= 300) escalate(2, "SUGAR_VERY_HIGH");
  }

  // --- 4. Danger symptoms (any condition) ---
  if (symptoms.some((s) => DANGER_SYMPTOMS.has(s))) {
    escalate(2, "DANGER_SYMPTOM");
  }

  // --- 5. Adherence ---
  if (missed >= 3) {
    if (condition === "tb") {
      escalate(2, "TB_MISSED_URGENT");
      escalate(1, "MISSED_DOSES");
    } else {
      escalate(1, "MISSED_DOSES");
    }
  }
  if (medicineTaken === false) {
    escalate(1, "MEDICINE_NOT_TAKEN");
  }

  // --- 6. Default ---
  if (codes.length === 0) codes.push("ALL_OK");

  const level: RiskLevel = severity === 2 ? "urgent" : severity === 1 ? "clinic" : "home";
  const adviceKey: AdviceKey =
    level === "urgent" ? "refer_urgent" : level === "clinic" ? "visit_clinic_week" : "continue_home_care";
  const nextVisitInDays =
    level === "urgent" ? 1 : level === "clinic" ? 7 : DEFAULT_VISIT_DAYS[condition] ?? 30;

  return { level, reasonCodes: codes, adviceKey, nextVisitInDays };
}