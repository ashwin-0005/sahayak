import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db.js";
import {
  applyPatientFromServer,
  applyVisitFromServer,
  clearOutbox,
  createPatient,
  getAllPatients,
  getPendingOutbox,
  getVisitsForPatient,
  recordVisit
} from "./repo";
import { newId } from "../lib/ids";
import type { Patient, Visit } from "../types";

function makePatient(over: Partial<Patient> = {}): Patient {
  const nowIso = new Date().toISOString();
  return {
    id: newId(),
    worker_id: null,
    name: "Test Person",
    age: 40,
    sex: "F",
    village: "Village A",
    phone: null,
    condition: "hypertension",
    language: "hi",
    consent_given: 1,
    consent_at: nowIso,
    next_visit_date: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    ...over
  };
}

function makeVisit(patientId: string, over: Partial<Visit> = {}): Visit {
  const nowIso = new Date().toISOString();
  return {
    id: newId(),
    patient_id: patientId,
    worker_id: null,
    visited_at: nowIso,
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
    created_at: nowIso,
    updated_at: nowIso,
    ...over
  };
}

beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });
});

describe("repo: outbox enqueues writes for later push", () => {
  it("createPatient persists locally AND enqueues a pushable snapshot without worker_id", async () => {
    const p = makePatient();
    await createPatient(p);

    const patients = await getAllPatients();
    expect(patients).toHaveLength(1);
    expect(patients[0].id).toBe(p.id);

    const outbox = await getPendingOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].table).toBe("patients");
    const snap = JSON.parse(outbox[0].record) as Record<string, unknown>;
    expect(snap.worker_id).toBeUndefined();
    expect(snap.id).toBe(p.id);
  });

  it("recordVisit rolls next_visit_date and enqueues visit + patient", async () => {
    const p = makePatient();
    await createPatient(p);

    const v = makeVisit(p.id, { risk_level: "clinic", reason_codes: ["BP_HIGH"], advice_key: "visit_clinic_week" });
    const { patient, visit } = await recordVisit(p, v, "2026-11-01");

    expect(visit.risk_level).toBe("clinic");
    expect(patient.next_visit_date).toBe("2026-11-01");

    const visits = await getVisitsForPatient(p.id);
    expect(visits).toHaveLength(1);

    const outbox = await getPendingOutbox();
    expect(outbox.filter((o) => o.table === "visits")).toHaveLength(1);
    // 1 patient snapshot from createPatient + 1 patient roll-forward from recordVisit.
    expect(outbox.filter((o) => o.table === "patients")).toHaveLength(2);
  });

  it("clearOutbox empties once pushed", async () => {
    await createPatient(makePatient());
    await clearOutbox();
    expect(await getPendingOutbox()).toHaveLength(0);
  });

  it("applyPatientFromServer never overwrites a NEWER local record (LWW)", async () => {
    const local = makePatient({ name: "Local Newer", updated_at: "2026-01-02T00:00:00.000Z" });
    await createPatient(local);

    const serverOld: Patient = { ...local, name: "Server Older", updated_at: "2026-01-01T00:00:00.000Z" };
    await applyPatientFromServer(serverOld);

    expect((await getAllPatients())[0].name).toBe("Local Newer");
  });

  it("applyVisitFromServer keeps the patient's own server risk (server risk wins)", async () => {
    const p = makePatient();
    await createPatient(p);
    const localVisit = makeVisit(p.id, { risk_level: "home", reason_codes: ["ALL_OK"], updated_at: "2026-01-02T00:00:00.000Z" });

    const serverNewer: Visit = {
      ...localVisit,
      risk_level: "urgent",
      reason_codes: ["BP_CRISIS"],
      updated_at: "2026-01-03T00:00:00.000Z"
    };
    await applyVisitFromServer(serverNewer);

    const visits = await getVisitsForPatient(p.id);
    expect(visits).toHaveLength(1);
    expect(visits[0].risk_level).toBe("urgent");
    expect(visits[0].reason_codes).toEqual(["BP_CRISIS"]);
  });

  it("applyPatientFromServer stores the server record when server is newer", async () => {
    const p = makePatient();
    await createPatient(p);
    const serverNewer = makePatient({ name: "Server Wins", updated_at: "2099-01-01T00:00:00.000Z", next_visit_date: "2099-02-01" });
    serverNewer.id = p.id;
    await applyPatientFromServer(serverNewer);

    expect((await getAllPatients())[0].name).toBe("Server Wins");
    expect((await getAllPatients())[0].next_visit_date).toBe("2099-02-01");
  });
});