import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "../db/db.js";
import { createPatient, setMeta } from "../db/repo";
import { newId } from "../lib/ids";
import "../i18n";
import HomePage from "./Home";

beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });
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

describe("Home cache-first render", () => {
  it("renders cached patients immediately while the server is unreachable", async () => {
    const nowIso = new Date().toISOString();
    await createPatient({
      id: newId(),
      worker_id: null,
      name: "Cached Meera",
      age: 45,
      sex: "F",
      village: "Sanwer",
      phone: null,
      condition: "hypertension",
      language: "hi",
      consent_given: 1,
      consent_at: nowIso,
      next_visit_date: "2026-09-01",
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null
    });
    await setMeta("auth", {
      workerId: "asha001",
      worker: { id: "asha001", name: "Meera", village: "Sanwer" },
      token: null,
      salt: "s",
      pinHash: "h"
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Cached Meera")).toBeTruthy();
    expect(await screen.findByText("Good day, Meera")).toBeTruthy();
  });
});
