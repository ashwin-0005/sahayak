import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { db } from "../db/db.js";
import { createPatient, recordVisit, setMeta } from "../db/repo";
import { newId } from "../lib/ids";
import { todayUTC } from "../lib/dates";
import "../i18n";
import HomePage from "./Home";
import type { Patient, Visit } from "../types";

const NOW = new Date().toISOString();

function makePatient(over: Partial<Patient> = {}): Patient {
  return {
    id: newId(),
    worker_id: null,
    name: "Test Person",
    age: 40,
    sex: "F",
    village: "Test Village",
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
  };
}

function makeVisit(
  patientId: string,
  over: Partial<Visit> = {}
): Visit {
  return {
    id: newId(),
    patient_id: patientId,
    worker_id: null,
    visited_at: NOW,
    systolic: 120,
    diastolic: 80,
    sugar_mg_dl: null,
    sugar_type: null,
    medicine_taken: 1,
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

async function seedSession() {
  await setMeta("auth", {
    workerId: "asha001",
    worker: { id: "asha001", name: "Meera", village: "Sanwer" },
    token: null,
    salt: "s",
    pinHash: "h"
  });
}

async function clearAll() {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.quarantine, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.quarantine.clear();
    await db.meta.clear();
  });
}

beforeEach(async () => {
  await clearAll();
  await seedSession();
  // Any network access fails the test: cached data must render on its own.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("network must not be touched");
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <HomePage />
    </MemoryRouter>
  );
}

describe("Home cache-first render", () => {
  it("renders cached patients immediately while the server is unreachable", async () => {
    await createPatient(
      makePatient({ name: "Cached Meera", next_visit_date: "2026-09-01" })
    );
    renderHome();

    expect(await screen.findByText("Cached Meera")).toBeTruthy();
    expect(screen.getByText("Good day, Meera")).toBeTruthy();
  });
});

describe("Today dashboard groups and urgency", () => {
  it("pins the urgent group first in the All queue", async () => {
    // Urgent patient (last visit was urgent) past their due date.
    const urgentP = makePatient({ name: "Urgent Raj", next_visit_date: "2026-09-05" });
    await createPatient(urgentP);
    await db.visits.put(makeVisit(urgentP.id, { risk_level: "urgent", reason_codes: ["BP_HIGH"] }));
    // Overdue but not urgent.
    await createPatient(makePatient({ name: "Normal Meera", next_visit_date: "2026-09-01" }));

    renderHome();
    await screen.findByText("Urgent Raj");

    const sections = screen.getAllByRole("region");
    const urgentSection = sections.find((s) => s.getAttribute("aria-label") === "Urgent follow-up");
    const overdueSection = sections.find((s) => s.getAttribute("aria-label") === "Overdue visits");
    expect(urgentSection).toBeTruthy();
    expect(overdueSection).toBeTruthy();
    expect(sections.indexOf(urgentSection!)).toBeLessThan(sections.indexOf(overdueSection!));
    expect(within(urgentSection!).getByText("Urgent Raj")).toBeTruthy();
    expect(within(overdueSection!).getByText("Normal Meera")).toBeTruthy();
  });

  it("filters the queue by Today and Overdue with working counts", async () => {
    await createPatient(makePatient({ name: "Due Now", next_visit_date: todayUTC() }));
    await createPatient(makePatient({ name: "Missed One", next_visit_date: "2020-01-01" }));
    await createPatient(makePatient({ name: "Far Future", next_visit_date: "2099-01-01" }));

    const user = userEvent.setup();
    renderHome();

    await user.click(await screen.findByRole("button", { name: "1 Today" }));
    expect(screen.queryByText("Missed One")).toBeNull();
    expect(screen.queryByText("Far Future")).toBeNull();
    expect(screen.getByText("Due Now")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "1 Overdue" }));
    expect(screen.queryByText("Due Now")).toBeNull();
    expect(screen.getByText("Missed One")).toBeTruthy();
    expect(screen.queryByText("Far Future")).toBeNull();

    await user.click(screen.getByRole("button", { name: "3 All" }));
    expect(screen.getByText("Due Now")).toBeTruthy();
    expect(screen.getByText("Missed One")).toBeTruthy();
    expect(screen.getByText("Far Future")).toBeTruthy();
    // Upcoming visits are their own plain-language group.
    const sections = screen.getAllByRole("region");
    expect(sections.some((s) => s.getAttribute("aria-label") === "Upcoming visits")).toBe(true);
  });

  it("lists records waiting to sync under the Needs sync filter", async () => {
    const p = makePatient({ name: "New Patient", next_visit_date: todayUTC() });
    await recordVisit(p, makeVisit(p.id), todayUTC());

    const user = userEvent.setup();
    renderHome();
    await screen.findByText("New Patient");

    await user.click(await screen.findByRole("button", { name: "2 Needs sync" }));
    const waiting = await screen.findByRole("region", { name: "Waiting to sync" });
    expect(within(waiting).getByText("New Patient")).toBeTruthy();
    expect(within(waiting).getByText("Not synced yet")).toBeTruthy();
  });
});

describe("Home non-happy states", () => {
  it("shows the offline banner without hiding cached data", async () => {
    await createPatient(makePatient({ name: "Cached Meera", next_visit_date: "2026-09-01" }));
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      renderHome();
      expect(await screen.findByText("You're offline")).toBeTruthy();
      expect(screen.getByText("Cached Meera")).toBeTruthy();
    } finally {
      delete (navigator as { onLine?: boolean }).onLine;
    }
  });

  it("shows empty states and the prominent add action when the queue is empty", async () => {
    renderHome();
    expect(await screen.findByText("No follow-ups yet")).toBeTruthy();
    // Prominent top action + empty-state action both surface adding a follow-up.
    expect(screen.getAllByRole("button", { name: "Add follow-up" }).length).toBeGreaterThanOrEqual(1);
  });
});