import { describe, expect, it } from "vitest";
import { last7DaysStart, startOfWeek, summarize, visitsByWeek, visitsInLast7Days } from "./insights";
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
    // Rolling window is today + the 6 prior days: today counts, exactly 7
    // days ago (09-16) no longer does.
    expect(s.visitsLast7).toBe(1);
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
    // The trailing bar is the rolling 7-day window (09-17..09-23), not the
    // calendar week: only the 09-23 visit falls inside it.
    expect(weeks[6]).toEqual({ label: "2026-09-17", count: 1 });
    const counts: Record<string, number> = Object.fromEntries(weeks.map((w) => [w.label, w.count]));
    expect(counts["2026-09-14"]).toBe(1);
    expect(counts["2026-09-07"]).toBe(1);
    expect(weeks.reduce((n, w) => n + w.count, 0)).toBe(3);
  });

  it("returns all-zero buckets when there are no recent visits", () => {
    const weeks = visitsByWeek([], "2026-09-23", 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.count === 0)).toBe(true);
    expect(weeks[3].label).toBe("2026-09-17");
  });

  it("returns [] for zero weeks", () => {
    expect(visitsByWeek([makeVisit("p1", NOW)], "2026-09-23", 0)).toEqual([]);
  });

  it("never renders two bars for the same range on Sundays", () => {
    // On a Sunday the rolling window start IS the week's Monday; the Monday
    // bucket must be skipped so the label appears exactly once.
    const weeks = visitsByWeek([makeVisit("p1", "2026-09-20T05:00:00Z")], "2026-09-20", 7);
    const labels = weeks.map((w) => w.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(weeks[6]).toEqual({ label: "2026-09-14", count: 1 });
  });
});

describe("visitsInLast7Days", () => {
  it("counts today through 6 days ago, excluding day 7 and future visits", () => {
    const visits = [
      makeVisit("p1", "2026-09-23T05:00:00Z"), // today
      makeVisit("p1", "2026-09-17T05:00:00Z"), // exactly 6 days ago: in
      makeVisit("p1", "2026-09-16T05:00:00Z"), // exactly 7 days ago: out
      makeVisit("p1", "2026-09-24T05:00:00Z") // future: out
    ];
    expect(visitsInLast7Days(visits, "2026-09-23")).toBe(2);
    expect(last7DaysStart("2026-09-23")).toBe("2026-09-17");
  });
});

describe("stat tile and chart agree", () => {
  const patients = [makePatient({ id: "p1" })];
  const visits = [
    makeVisit("p1", "2026-09-14T05:00:00Z"),
    makeVisit("p1", "2026-09-19T05:00:00Z"),
    makeVisit("p1", "2026-09-20T05:00:00Z"),
    makeVisit("p1", "2026-09-21T05:00:00Z"),
    makeVisit("p1", "2026-09-28T05:00:00Z") // future: never counted
  ];

  it.each([
    // [today, expected rolling count]
    ["2026-09-21", 3], // Monday: the old calendar-week bar would have said 1
    ["2026-09-20", 3], // Sunday
    ["2026-09-23", 3], // Wednesday
    ["2026-09-27", 1] // Sunday: only the 09-21 visit is still inside
  ] as [string, number][])("tile == last chart bar on %s", (today, expected) => {
    expect(summarize(patients, visits, today).visitsLast7).toBe(expected);
    const weeks = visitsByWeek(visits, today, 7);
    expect(weeks[weeks.length - 1].count).toBe(expected);
  });
});