import { describe, expect, it, vi } from "vitest";
import { buildPatientSummary } from "./summary";
import type { Patient, Visit } from "../types";

// Mock dates module to return predictable formats for testing
vi.mock("./dates", () => ({
  formatDate: vi.fn((isoOrDate: string, _locale = "en") => {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day} ${month} ${year}`; // predictable "DD MM YYYY"
  }),
  formatTime: vi.fn((iso: string, _locale = "en") => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${hour}:${minute}`;
  }),
  formatNumber: vi.fn((value: number, _locale = "en") => String(value)),
  todayUTC: vi.fn(() => "2026-09-23")
}));

// Mock i18n before importing the module under test
vi.mock("../i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../i18n")>();
  const translations: Record<string, Record<string, string>> = {
    en: {
      "detail.summaryTitle": "Patient Summary",
      "detail.summaryPatientInfo": "Patient: {{name}}, {{age}} yrs, {{village}}",
      "detail.summaryCondition": "Condition: {{condition}}",
      "detail.summaryVisits": "Recent visits (up to 3):",
      "detail.summaryVisitLine": "• {{date}}: {{readings}} — {{risk}}",
      "detail.summaryNoVisits": "No visits recorded yet.",
      "detail.summaryCurrentRisk": "Current risk: {{risk}} ({{reason}})",
      "detail.bp": "BP",
      "detail.sugar": "Sugar",
      "detail.noTrend": "No recent readings yet",
      "condition.hypertension": "Blood pressure",
      "condition.diabetes": "Diabetes",
      "condition.tb": "TB",
      "condition.pregnancy": "Pregnancy",
      "risk.urgent": "Urgent",
      "risk.clinic": "Clinic",
      "risk.home": "Home",
      "visit.fasting": "Fasting",
      "visit.random": "Random",
"reason.BP_CRISIS": "Blood pressure is dangerously high",
          "reason.BP_HIGH": "Blood pressure is high",
          "reason.BP_LOW": "Blood pressure is low",
          "reason.ALL_OK": "Everything looks under control"
        },
        hi: {
          "detail.summaryTitle": "मरीज़ का सारांश",
          "detail.summaryPatientInfo": "मरीज़: {{name}}, {{age}} वर्ष, {{village}}",
          "detail.summaryCondition": "बीमारी: {{condition}}",
          "detail.summaryVisits": "हाल की मुलाकातें (अधिकतम 3):",
          "detail.summaryVisitLine": "• {{date}}: {{readings}} — {{risk}}",
          "detail.summaryNoVisits": "अभी कोई मुलाकात दर्ज नहीं।",
          "detail.summaryCurrentRisk": "वर्तमान जोखिम: {{risk}} ({{reason}})",
          "detail.bp": "बीपी",
          "detail.sugar": "शर्करा",
          "detail.noTrend": "अभी कोई हालिया माप नहीं है",
          "condition.hypertension": "रक्तचाप",
          "condition.diabetes": "मधुमेह",
          "condition.tb": "टीबी",
          "condition.pregnancy": "गर्भावस्था",
          "risk.urgent": "तुरंत",
          "risk.clinic": "क्लिनिक",
          "risk.home": "घर",
          "visit.fasting": "खाली पेट",
          "visit.random": "सामान्य",
          "reason.BP_CRISIS": "रक्तचाप खतरनाक रूप से बहुत अधिक है",
          "reason.BP_HIGH": "रक्तचाप अधिक है",
          "reason.BP_LOW": "रक्तचाप कम है",
          "reason.ALL_OK": "सब नियंत्रण में लगता है"
        }
  };

  function t(key: string, options?: { lng?: string; [key: string]: unknown }): string {
    const lng = options?.lng ?? "en";
    const t = translations[lng]?.[key] || translations.en[key] || key;
    if (options) {
      return Object.entries(options).reduce((str, [k, v]) => str.replace(`{{${k}}}`, String(v)), t);
    }
    return t;
  }

  return {
    ...actual,
    i18n: {
      ...actual.i18n,
      t: vi.fn(t)
    }
  };
});

function makePatient(over: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    worker_id: "demo",
    name: "Test Patient",
    age: 45,
    sex: "F",
    village: "Test Village",
    phone: "9876543210",
    condition: "hypertension",
    language: "en",
    consent_given: 1,
    consent_at: "2026-01-01T00:00:00Z",
    next_visit_date: "2026-10-01",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...over
  } as Patient;
}

function makeVisit(over: Partial<Visit> = {}): Visit {
  return {
    id: "v1",
    patient_id: "p1",
    worker_id: "demo",
    visited_at: "2026-09-20T10:00:00Z",
    systolic: 140,
    diastolic: 90,
    sugar_mg_dl: null,
    sugar_type: null,
    medicine_taken: 1,
    missed_doses: 0,
    symptoms: [],
    notes: null,
    risk_level: "clinic",
    reason_codes: ["BP_HIGH"],
    advice_key: "visit_clinic_week",
    override: 0,
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    ...over
  } as Visit;
}

describe("buildPatientSummary", () => {
  const basePatient = makePatient();
  const baseVisit = makeVisit();

  it("includes patient name, age, village, and condition in English", () => {
    const summary = buildPatientSummary(basePatient, [], "en");
    expect(summary).toContain("Patient Summary");
    expect(summary).toContain("Patient: Test Patient, 45 yrs, Test Village");
    expect(summary).toContain("Condition: Blood pressure");
  });

  it("includes patient info in Hindi when lng=hi", () => {
    const summary = buildPatientSummary(basePatient, [], "hi");
    expect(summary).toContain("मरीज़ का सारांश");
    expect(summary).toContain("मरीज़: Test Patient, 45 वर्ष, Test Village");
    expect(summary).toContain("बीमारी: रक्तचाप");
  });

  it("shows 'No visits recorded' when visits array is empty", () => {
    const summary = buildPatientSummary(basePatient, [], "en");
    expect(summary).toContain("No visits recorded yet.");
  });

  it("lists up to 3 most recent visits with date, readings, and risk", () => {
    const v1 = makeVisit({ id: "v1", visited_at: "2026-09-20T10:00:00Z", systolic: 140, diastolic: 90, risk_level: "clinic", reason_codes: ["BP_HIGH"] });
    const v2 = makeVisit({ id: "v2", visited_at: "2026-09-15T10:00:00Z", systolic: 130, diastolic: 85, risk_level: "home", reason_codes: ["ALL_OK"] });
    const v3 = makeVisit({ id: "v3", visited_at: "2026-09-10T10:00:00Z", systolic: 150, diastolic: 95, risk_level: "clinic", reason_codes: ["BP_HIGH"] });
    const v4 = makeVisit({ id: "v4", visited_at: "2026-09-05T10:00:00Z", systolic: 160, diastolic: 100, risk_level: "urgent", reason_codes: ["BP_CRISIS"] });

    const summary = buildPatientSummary(basePatient, [v1, v2, v3, v4], "en");
    expect(summary).toContain("Recent visits (up to 3):");
    expect(summary).toContain("BP 140/90"); // v1 (most recent)
    expect(summary).toContain("BP 130/85"); // v2
    expect(summary).toContain("BP 150/95"); // v3
    expect(summary).not.toContain("BP 160/100"); // v4 should not appear (only 3 shown)
  });

  it("shows visit readings with BP and sugar when available", () => {
    const v = makeVisit({ systolic: 140, diastolic: 90, sugar_mg_dl: 150, sugar_type: "fasting" });
    const summary = buildPatientSummary(basePatient, [v], "en");
    expect(summary).toContain("BP 140/90");
    expect(summary).toContain("Sugar 150");
  });

  it("shows only available readings when one is missing", () => {
    const v1 = makeVisit({ systolic: 140, diastolic: 90, sugar_mg_dl: null });
    const summary = buildPatientSummary(basePatient, [v1], "en");
    expect(summary).toContain("BP 140/90");
    expect(summary).not.toContain("Sugar");
  });

  it("includes current risk level and reason from last visit", () => {
    const v = makeVisit({ risk_level: "urgent", reason_codes: ["BP_CRISIS"] });
    const summary = buildPatientSummary(basePatient, [v], "en");
    expect(summary).toContain("Current risk: Urgent");
    expect(summary).toContain("Blood pressure is dangerously high");
  });

  it("handles multiple reason codes by joining them", () => {
    const v = makeVisit({ reason_codes: ["BP_HIGH", "BP_LOW"] });
    const summary = buildPatientSummary(basePatient, [v], "en");
    expect(summary).toContain("Blood pressure is high");
    expect(summary).toContain("Blood pressure is low");
  });

  it("sorts visits by date descending (most recent first)", () => {
    const vOld = makeVisit({ id: "v-old", visited_at: "2026-09-01T10:00:00Z" });
    const vNew = makeVisit({ id: "v-new", visited_at: "2026-09-20T10:00:00Z" });
    const summary = buildPatientSummary(basePatient, [vOld, vNew], "en");
    // v-new should appear before v-old in the output
    const idxNew = summary.indexOf("20 09 2026");
    const idxOld = summary.indexOf("01 09 2026");
    expect(idxNew).toBeLessThan(idxOld);
  });

  it("filters visits by patient_id", () => {
    const otherPatientVisit = makeVisit({ patient_id: "other", id: "v-other" });
    const summary = buildPatientSummary(basePatient, [baseVisit, otherPatientVisit], "en");
    // Should only show baseVisit (patient_id: p1), not the other patient's visit
    expect(summary).toContain("20 09 2026");
    // The count of visit lines should be 1 (only baseVisit matches)
    const visitLineCount = (summary.match(/•/g) || []).length;
    expect(visitLineCount).toBe(1);
  });
});