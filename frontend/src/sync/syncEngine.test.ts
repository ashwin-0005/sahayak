import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db.js";
import { createPatient, getAllPatients, getPendingOutbox, getVisitsForPatient, setMeta } from "../db/repo";
import { newId } from "../lib/ids";
import { syncNow } from "./syncEngine";
import type { Patient, Visit } from "../types";

function makePatient(): Patient {
  const nowIso = new Date().toISOString();
  return {
    id: newId(),
    worker_id: null,
    name: "Priya",
    age: 34,
    sex: "F",
    village: "Depalpur",
    phone: "9876543210",
    condition: "diabetes",
    language: "hi",
    consent_given: 1,
    consent_at: nowIso,
    next_visit_date: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  await setMeta("auth", { token: "tok-123", workerId: "asha001" });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncEngine: push, apply, and clear on success", () => {
  it("posts pending outbox (without worker_id) and retains nothing locally after ack", async () => {
    const localPatient = makePatient();
    await createPatient(localPatient);

    // Echo the patient back with server risk + newer updated_at so apply PULLS it.
    const serverPatient: Patient = {
      ...localPatient,
      updated_at: "2099-01-01T00:00:00.000Z"
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        patients: [serverPatient],
        visits: [],
        serverTime: "2099-01-01T00:00:00.000Z"
      })
    });

    const ok = await syncNow();
    expect(ok).toBe(true);

    // The request carried our local snapshot, without the worker's own id.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok-123" });
    const body = JSON.parse(init.body as string) as { patients: Record<string, unknown>[]; visits: unknown[] };
    expect(body.patients).toHaveLength(1);
    expect(body.patients[0].worker_id).toBeUndefined();
    expect(body.patients[0].id).toBe(localPatient.id);

    // Outbox fully cleared on success — never partially consumed.
    expect(await getPendingOutbox()).toHaveLength(0);
    // Server rows applied (server risk / timestamps win).
    const applied = await getAllPatients();
    expect(applied).toHaveLength(1);
    expect(applied[0].updated_at).toBe("2099-01-01T00:00:00.000Z");
    expect(await db.meta.get("lastPulledAt")).toMatchObject({ value: "2099-01-01T00:00:00.000Z" });
    expect(await db.meta.get("lastSyncAt")).toBeTruthy();
  });

  it("applies server visits and their server-computed risk fields", async () => {
    const localPatient = makePatient();
    await createPatient(localPatient);

    const serverVisit: Visit = {
      id: newId(),
      patient_id: localPatient.id,
      worker_id: "asha001",
      visited_at: "2099-01-01T08:00:00.000Z",
      systolic: 190,
      diastolic: 120,
      sugar_mg_dl: null,
      sugar_type: null,
      medicine_taken: null,
      missed_doses: 0,
      symptoms: "[]", // backend sends JSON strings
      notes: null,
      risk_level: "urgent",
      reason_codes: '["BP_CRISIS"]',
      advice_key: "refer_urgent",
      created_at: "2099-01-01T08:00:00.000Z",
      updated_at: "2099-01-01T08:00:00.000Z"
    } as unknown as Visit;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ patients: [], visits: [serverVisit], serverTime: "2099-01-01T08:00:00.000Z" })
    });

    expect(await syncNow()).toBe(true);

    const visits = await getVisitsForPatient(localPatient.id);
    expect(visits).toHaveLength(1);
    expect(visits[0].risk_level).toBe("urgent");
    expect(visits[0].symptoms).toEqual([]);
    expect(visits[0].reason_codes).toEqual(["BP_CRISIS"]);
  });

  it("keeps the outbox intact when the server rejects", async () => {
    await createPatient(makePatient());

    // 401 -> server did not accept the payload; outbox MUST survive.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { code: "UNAUTHORIZED", message: "bad token" } })
    });

    const ok = await syncNow();
    expect(ok).toBe(false);
    expect(await getPendingOutbox()).toHaveLength(1);
  });
});