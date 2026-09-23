import { lastRisk, overdueDays } from "./records";
import type { Condition, Patient, Visit } from "../types";

const MS_DAY = 86400000;

// Monday as the first day of the week (UTC), matching the backend's YYYY-MM-DD day keys.
export function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
}

function daysSince(isoDateTime: string, today: string): number {
  return Math.floor(
    (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${isoDateTime.slice(0, 10)}T00:00:00Z`).getTime()) / MS_DAY
  );
}

export interface InsightsStats {
  totalPatients: number;
  villages: number;
  // Patients with a follow-up date that has arrived (today or earlier).
  dueNow: number;
  dueToday: number;
  overdue: number;
  visitsLast7: number;
  visitsLast30: number;
  // Risk counts count each patient once, from their last recorded visit.
  health: {
    urgent: number;
    clinic: number;
    home: number;
    unassessed: number;
  };
  conditions: Record<Condition, number>;
}

export interface WeekVisits {
  label: string; // YYYY-MM-DD of the week's Monday
  count: number;
}

export function summarize(patients: Patient[], visits: Visit[], today: string): InsightsStats {
  const villages = new Set<string>();
  let dueNow = 0;
  let dueToday = 0;
  let overdue = 0;
  const health = { urgent: 0, clinic: 0, home: 0, unassessed: 0 };
  const conditions: Record<Condition, number> = { hypertension: 0, diabetes: 0, tb: 0, pregnancy: 0 };

  for (const p of patients) {
    villages.add(p.village);
    conditions[p.condition] += 1;

    const od = overdueDays(p, today);
    if (od !== null && od >= 0) dueNow += 1;
    if (od === 0) dueToday += 1;
    if (od !== null && od > 0) overdue += 1;

    const risk = lastRisk(visits, p.id);
    if (risk) health[risk] += 1;
    else health.unassessed += 1;
  }

  let visitsLast7 = 0;
  let visitsLast30 = 0;
  for (const v of visits) {
    const d = daysSince(v.visited_at, today);
    if (d >= 0 && d <= 7) visitsLast7 += 1;
    if (d >= 0 && d <= 30) visitsLast30 += 1;
  }

  return {
    totalPatients: patients.length,
    villages: villages.size,
    dueNow,
    dueToday,
    overdue,
    visitsLast7,
    visitsLast30,
    health,
    conditions
  };
}

// Per-week visit counts for the trailing `weeks` weeks (Monday-bucketed),
// oldest first. Weeks with no visits are included so the chart never drifts.
export function visitsByWeek(visits: Visit[], today: string, weeks: number): WeekVisits[] {
  const start = startOfWeek(today);
  const buckets = new Map<string, number>();
  for (let i = 0; i < weeks; i += 1) {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const v of visits) {
    const week = startOfWeek(v.visited_at.slice(0, 10));
    if (buckets.has(week)) {
      buckets.set(week, (buckets.get(week) ?? 0) + 1);
    }
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([label, count]) => ({ label, count }));
}