import { daysOverdue, todayUTC } from "./dates";
import type { Patient, RiskLevel, Visit } from "../types";

export function lastVisit(visits: Visit[], patientId: string): Visit | undefined {
  const list = visits.filter((v) => v.patient_id === patientId);
  if (list.length === 0) return undefined;
  return list.sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1))[0];
}

export function lastRisk(visits: Visit[], patientId: string): RiskLevel | null {
  return lastVisit(visits, patientId)?.risk_level ?? null;
}

export function overdueDays(patient: Patient, asOf: string = todayUTC()): number | null {
  if (!patient.next_visit_date) return null;
  return daysOverdue(patient.next_visit_date, asOf);
}

export const RISK_RANK: Record<RiskLevel, number> = { urgent: 0, clinic: 1, home: 2 };

// Patients due as of today, sorted urgent-first then most-overdue.
export function dueNow(patients: Patient[], visits: Visit[]): Patient[] {
  return patients
    .filter((p) => {
      const od = overdueDays(p);
      return od !== null && od >= 0;
    })
    .sort((a, b) => {
      const ra = RISK_RANK[lastRisk(visits, a.id) ?? "home"] ?? 2;
      const rb = RISK_RANK[lastRisk(visits, b.id) ?? "home"] ?? 2;
      if (ra !== rb) return ra - rb;
      return (overdueDays(b) ?? 0) - (overdueDays(a) ?? 0);
    });
}