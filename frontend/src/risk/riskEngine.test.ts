import { describe, expect, it } from "vitest";
import { assessRisk as clientAssess } from "./riskEngine";
import type { RiskInput } from "./riskEngine";
import { assessRisk as serverAssess } from "../../../backend/src/services/riskEngine";

// The client risk engine must be a faithful offline mirror of the backend.
// We run the SAME deterministic inputs through both implementations and
// require identical outcomes. Any divergence here is a blocking bug.
const CASES: RiskInput[] = [
  { condition: "hypertension", age: 45, systolic: 185, diastolic: 125 },
  { condition: "hypertension", age: 45, systolic: 150, diastolic: 95 },
  { condition: "hypertension", age: 45, systolic: 120, diastolic: 80 },
  { condition: "hypertension", age: 45, systolic: 80, diastolic: 50 },
  { condition: "hypertension", age: 45 },
  { condition: "hypertension", age: 20, systolic: 20, diastolic: 80 },
  { condition: "hypertension", age: 20, systolic: 140, diastolic: 130 },
  { condition: "pregnancy", age: 24, systolic: 165, diastolic: 115 },
  { condition: "pregnancy", age: 24, systolic: 142, diastolic: 92 },
  { condition: "pregnancy", age: 24, systolic: 120, diastolic: 80 },
  { condition: "pregnancy", age: 24 },
  { condition: "pregnancy", age: 24, systolic: 88, diastolic: 62 },
  { condition: "pregnancy", age: 24, systolic: 120, diastolic: 80, symptoms: ["severe_headache"] },
  { condition: "pregnancy", age: 24, systolic: 120, diastolic: 80, symptoms: ["convulsions", "chest_pain"] },
  { condition: "diabetes", age: 50, sugarMgDl: 65 },
  { condition: "diabetes", age: 50, sugarMgDl: 320 },
  { condition: "diabetes", age: 50, sugarMgDl: 210, sugarType: "random" },
  { condition: "diabetes", age: 50, sugarMgDl: 140, sugarType: "fasting" },
  { condition: "diabetes", age: 50, sugarMgDl: 120, sugarType: "fasting" },
  { condition: "diabetes", age: 50, sugarMgDl: 175, sugarType: null },
  { condition: "diabetes", age: 50 },
  { condition: "diabetes", age: 50, sugarMgDl: 10, sugarType: "random" },
  { condition: "tb", age: 34, missedDoses: 3 },
  { condition: "tb", age: 34, missedDoses: 5, medicineTaken: false },
  { condition: "tb", age: 34, missedDoses: 2, medicineTaken: false },
  { condition: "tb", age: 34, missedDoses: 0, medicineTaken: true },
  { condition: "hypertension", age: 60, systolic: 140, diastolic: 90, medicineTaken: false },
  { condition: "hypertension", age: 40, systolic: 200, diastolic: 100, medicineTaken: true, symptoms: ["chest_pain", "fainting"] },
  { condition: "diabetes", age: 45, sugarMgDl: 250, sugarType: "random", symptoms: ["confusion"], medicineTaken: false },
  { condition: "pregnancy", age: 22, systolic: 100, diastolic: 70, symptoms: ["bleeding", "reduced_fetal_movement"] },
  { condition: "hypertension", age: 30, systolic: 0, diastolic: 0 }
];

function sortCodes(codes: string[]): string[] {
  return [...codes].sort();
}

describe("risk engine parity: client copy matches backend", () => {
  for (const [i, input] of CASES.entries()) {
    it(`case ${i + 1}: ${JSON.stringify(input)}`, () => {
      const client = clientAssess(input);
      const server = serverAssess(input as never);
      expect(client.level).toBe(server.level);
      expect(client.adviceKey).toBe(server.adviceKey);
      expect(client.nextVisitInDays).toBe(server.nextVisitInDays);
      expect(sortCodes(client.reasonCodes)).toEqual(sortCodes(server.reasonCodes));
    });
  }
});