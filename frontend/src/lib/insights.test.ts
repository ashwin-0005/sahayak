import { describe, expect, it } from "vitest";
import { startOfWeek, summarize, visitsByWeek } from "./insights";
import type { Patient, Visit } from "../types";

const NOW = "2026-09-23T05:00:00Z";

function makePatient(over: Partial<Patient>): Patient {
  return {
    id: "",
    worker_id: null,
    name: "",
    age: 40,
    sex: "F",
    village: "Village A",
    phone: null,
    condition: "hypertension",
    language: "hi",
    consent_given: 1,
    consent_at: NOW,
    next_visit_date: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...over
  } as Patient;
}

function makeVisit(patientId: string, visitedAt: string, over: Partial<Visit> = {}): Visit {
  return {
    id: "",
    patient_id: patientId,
    worker_id: null,
    visited_at: visitedAt,
    systolic: null,
    diastolic: null,
    sugar_mg_dl: null,
    sugar_type: null,
    medicine_taken: null,
    missed_doses: 0,
    symptoms: [],
    notes: null,
    risk_level: "home",
    reason_codes: ["ALL_OK"],
    advice_key: "continue_home_care",
    override: 0,
    created_at: NOW,
    updated_at: NOW,
    ...over
  };
}

describe("startOfWeek", () => {
  it("returns the Monday of the same week (Wednesday)", () => {
    expect(startOfWeek("2026-09-23")).toBe("2026-09-21");
  });
  it("returns the Monday before when the day is a Sunday", () => {
    expect(startOfWeek("2026-09-20")).toBe("2026-09-14");
  });
});

describe("summarize", () => {
  const patients = [
    makePatient({ id: "p1", next_visit_date: "2026-09-23" }),
    makePatient({ id: "p2", village: "Village A", condition: "diabetes", next_visit_date: "2026-09-10" }),
    makePatient({ id: "p3", village: "Village B", condition: "tb" }),
    makePatient({ id: "p4", village: "Village A", condition: "pregnancy", next_visit_date: "2026-10-01" })
  ];
  const visits = [
    makeVisit("p1", "2026-09-23T05:00:00Z", { risk_level: "urgent" }),
    makeVisit("p2", "2026-09-16T05:00:00Z", { risk_level: "home" }),
    makeVisit("p2", "2026-09-10T05:00:00Z", { risk_level: "clinic" }),
    makeVisit("p4", "2026-08-01T05:00:00Z", { risk_level: "clinic" })
  ];

  it("counts patients, unique villages and conditions", () => {
    const s = summarize(patients, visits, "2026-09-23");
    expect(s.totalPatients).toBe(4);
    expect(s.villages).toBe(2);
    expect(s.conditions).toEqual({ hypertension: 1, diabetes: 1, tb: 1, pregnancy: 1 });
  });

  it("splits due-today, overdue and future follow-ups", () => {
    const s = summarize(patients, visits, "2026-09-23");
    expect(s.dueToday).toBe(1); // p1
    expect(s.overdue).toBe(1); // p2
    expect(s.dueNow).toBe(2); // p1 + p2
  });

  it("classifies risk from each patient's LAST visit and leaves unassessed alone", () => {
    const s = summarize(patients, visits, "2026-09-23");
    expect(s.health.urgent).toBe(1); // p1
    expect(s.health.home).toBe(1); // p2 newest visit is home, not clinic
    expect(s.health.clinic).toBe(1); // p4
    expect(s.health.unassessed).toBe(1); // p3 never visited
  });

  it("buckets visit counts by the last 7 and 30 days", () => {
    const s = summarize(patients, visits, "2026-09-23");
    expect(s.visitsLast7).toBe(2); // today + exactly 7 days ago
    expect(s.visitsLast30).toBe(3); // adds the 13-days-ago visit
  });
});

describe("visitsByWeek", () => {
  it("returns the trailing window with zero-filled weeks, oldest first", () => {
    const visits = [
      makeVisit("p1", "2026-09-23T05:00:00Z"),
      makeVisit("p2", "2026-09-16T05:00:00Z"),
      makeVisit("p2", "2026-09-10T05:00:00Z")
    ];
    const weeks = visitsByWeek(visits, "2026-09-23", 7);
    expect(weeks).toHaveLength(7);
    expect(weeks[0].label).toBe("2026-08-10");
    expect(weeks[6].label).toBe("2026-09-21");
    const counts: Record<string, number> = Object.fromEntries(weeks.map((w) => [w.label, w.count]));
    expect(counts["2026-09-21"]).toBe(1);
    expect(counts["2026-09-14"]).toBe(1);
    expect(counts["2026-09-07"]).toBe(1);
    expect(weeks.reduce((n, w) => n + w.count, 0)).toBe(3);
  });

  it("returns all-zero buckets when there are no recent visits", () => {
    const weeks = visitsByWeek([], "2026-09-23", 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.count === 0)).toBe(true);
  });
});