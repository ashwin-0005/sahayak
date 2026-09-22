import { describe, expect, it } from "vitest";
import { assessRisk, type RiskInput } from "../src/services/riskEngine.js";

interface Case {
  name: string;
  input: RiskInput;
  level: "urgent" | "clinic" | "home";
  codes: string[];
  adviceKey: string;
  nextDays: number;
}

const cases: Case[] = [
  { name: "healthy hypertension normal", input: { condition: "hypertension", age: 50, systolic: 120, diastolic: 80 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 30 },
  { name: "BP boundary 139/89 home", input: { condition: "hypertension", age: 50, systolic: 139, diastolic: 89 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 30 },
  { name: "BP boundary 140/90 clinic", input: { condition: "hypertension", age: 50, systolic: 140, diastolic: 90 }, level: "clinic", codes: ["BP_HIGH"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "BP 179/119 clinic", input: { condition: "hypertension", age: 55, systolic: 179, diastolic: 119 }, level: "clinic", codes: ["BP_HIGH"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "BP 180/120 urgent", input: { condition: "hypertension", age: 55, systolic: 180, diastolic: 120 }, level: "urgent", codes: ["BP_CRISIS"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "BP crisis systolic only", input: { condition: "diabetes", age: 60, systolic: 185, diastolic: 85, sugarMgDl: 140, sugarType: "random" }, level: "urgent", codes: ["BP_CRISIS"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "BP crisis diastolic only", input: { condition: "hypertension", age: 60, systolic: 130, diastolic: 125 }, level: "urgent", codes: ["BP_CRISIS"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "BP low", input: { condition: "hypertension", age: 60, systolic: 85, diastolic: 55 }, level: "clinic", codes: ["BP_LOW"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "BP low diastolic only", input: { condition: "hypertension", age: 60, systolic: 110, diastolic: 55 }, level: "clinic", codes: ["BP_LOW"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "HTN missing BP", input: { condition: "hypertension", age: 60 }, level: "clinic", codes: ["BP_MISSING"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "pregnancy 140/90 urgent (stricter)", input: { condition: "pregnancy", age: 25, systolic: 140, diastolic: 90 }, level: "urgent", codes: ["PREG_HIGH_BP"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "pregnancy 139/89 home", input: { condition: "pregnancy", age: 25, systolic: 139, diastolic: 89 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 28 },
  { name: "pregnancy severe 160/110", input: { condition: "pregnancy", age: 25, systolic: 160, diastolic: 110 }, level: "urgent", codes: ["PREG_SEVERE_BP"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "pregnancy danger sign", input: { condition: "pregnancy", age: 25, systolic: 120, diastolic: 80, symptoms: ["severe_headache"] }, level: "urgent", codes: ["PREG_DANGER_SIGN"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "pregnancy missing BP", input: { condition: "pregnancy", age: 25 }, level: "clinic", codes: ["BP_MISSING"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "hypoglycemia", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80, sugarMgDl: 65, sugarType: "fasting" }, level: "urgent", codes: ["HYPOGLYCEMIA"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "sugar very high 320", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80, sugarMgDl: 320, sugarType: "random" }, level: "urgent", codes: ["SUGAR_VERY_HIGH"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "sugar high random 210", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80, sugarMgDl: 210, sugarType: "random" }, level: "clinic", codes: ["SUGAR_HIGH"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "sugar high fasting 130", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80, sugarMgDl: 130, sugarType: "fasting" }, level: "clinic", codes: ["SUGAR_HIGH"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "sugar fasting 125 home", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80, sugarMgDl: 125, sugarType: "fasting" }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 30 },
  { name: "diabetes missing sugar", input: { condition: "diabetes", age: 55, systolic: 120, diastolic: 80 }, level: "clinic", codes: ["SUGAR_MISSING"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "danger symptom chest pain", input: { condition: "tb", age: 40, systolic: 120, diastolic: 80, symptoms: ["chest_pain"] }, level: "urgent", codes: ["DANGER_SYMPTOM"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "missed doses 3", input: { condition: "hypertension", age: 50, systolic: 120, diastolic: 80, missedDoses: 3 }, level: "clinic", codes: ["MISSED_DOSES"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "missed doses 2 ok", input: { condition: "hypertension", age: 50, systolic: 120, diastolic: 80, missedDoses: 2 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 30 },
  { name: "TB missed urgent", input: { condition: "tb", age: 40, systolic: 120, diastolic: 80, missedDoses: 4 }, level: "urgent", codes: ["TB_MISSED_URGENT", "MISSED_DOSES"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "medicine not taken", input: { condition: "hypertension", age: 50, systolic: 120, diastolic: 80, medicineTaken: false }, level: "clinic", codes: ["MEDICINE_NOT_TAKEN"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "implausible systolic low", input: { condition: "hypertension", age: 50, systolic: 40, diastolic: 80 }, level: "clinic", codes: ["IMPLAUSIBLE_READING"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "implausible sys<=dia", input: { condition: "hypertension", age: 50, systolic: 80, diastolic: 90 }, level: "clinic", codes: ["IMPLAUSIBLE_READING"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "implausible sugar", input: { condition: "diabetes", age: 50, systolic: 120, diastolic: 80, sugarMgDl: 5, sugarType: "random" }, level: "urgent", codes: ["IMPLAUSIBLE_READING", "HYPOGLYCEMIA"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "multi-rule highest wins + all codes", input: { condition: "hypertension", age: 60, systolic: 190, diastolic: 100, missedDoses: 5, symptoms: ["chest_pain"] }, level: "urgent", codes: ["BP_CRISIS", "DANGER_SYMPTOM", "MISSED_DOSES"], adviceKey: "refer_urgent", nextDays: 1 },
  { name: "multi clinic+home lists clinic", input: { condition: "diabetes", age: 55, systolic: 150, diastolic: 95, sugarMgDl: 210, sugarType: "random" }, level: "clinic", codes: ["BP_HIGH", "SUGAR_HIGH"], adviceKey: "visit_clinic_week", nextDays: 7 },
  { name: "TB default home 7 days", input: { condition: "tb", age: 35, systolic: 120, diastolic: 80 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 7 },
  { name: "pregnancy default home 28 days", input: { condition: "pregnancy", age: 25, systolic: 110, diastolic: 70 }, level: "home", codes: ["ALL_OK"], adviceKey: "continue_home_care", nextDays: 28 },
];

describe("assessRisk", () => {
  for (const c of cases) {
    it(c.name, () => {
      const r = assessRisk(c.input);
      expect(r.level).toBe(c.level);
      for (const code of c.codes) expect(r.reasonCodes).toContain(code);
      expect(r.adviceKey).toBe(c.adviceKey);
      expect(r.nextVisitInDays).toBe(c.nextDays);
    });
  }

  it("is pure/deterministic", () => {
    const input: RiskInput = { condition: "hypertension", age: 50, systolic: 150, diastolic: 95 };
    expect(assessRisk(input)).toEqual(assessRisk(input));
  });
});
