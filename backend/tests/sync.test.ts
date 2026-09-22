import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getDb } from "../src/db/client.js";
import { seedWorker, useTestDb } from "./helpers.js";

const app = createApp();

const now = () => new Date().toISOString();

function patient(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: "Test Patient",
    age: 50,
    sex: "F",
    village: "Testgaon",
    phone: "9876500000",
    condition: "hypertension",
    language: "en",
    consent_given: 1,
    consent_at: now(),
    next_visit_date: "2026-10-01",
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
    ...overrides,
  };
}

function visit(id: string, patientId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    patient_id: patientId,
    visited_at: "2026-09-20T10:00:00.000Z",
    systolic: 120,
    diastolic: 80,
    sugar_mg_dl: null,
    sugar_type: null,
    medicine_taken: 1,
    missed_doses: 0,
    symptoms: [],
    notes: null,
    updated_at: now(),
    ...overrides,
  };
}

describe("sync", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-for-sync-tests-1234567890";
    useTestDb("test-sync.db");
    seedWorker("w1", "1234", "Asha One", "VillageA");
    seedWorker("w2", "5678", "Asha Two", "VillageB");
  });

  it("login works and rejects bad pin", async () => {
    const ok = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "0000" });
    expect(bad.status).toBe(401);
  });

  it("sync upserts + is idempotent on replay", async () => {
    const login = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    const token = login.body.token;
    const pid = "11111111-1111-4111-8111-111111111111";
    const vid = "22222222-2222-4222-8222-222222222222";
    const payload = {
      lastPulledAt: null,
      patients: [patient(pid)],
      visits: [visit(vid, pid)],
    };
    const r1 = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send(payload);
    expect(r1.status).toBe(200);
    expect(r1.body.patients.length).toBeGreaterThanOrEqual(1);
    const count1 = (getDb().prepare("SELECT COUNT(*) c FROM visits").get() as { c: number }).c;
    const r2 = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send(payload);
    expect(r2.status).toBe(200);
    const count2 = (getDb().prepare("SELECT COUNT(*) c FROM visits").get() as { c: number }).c;
    expect(count2).toBe(count1);
  });

  it("older record is ignored (last-write-wins)", async () => {
    const login = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    const token = login.body.token;
    const pid = "33333333-3333-4333-8333-333333333333";
    const newer = patient(pid, { name: "New Name", updated_at: "2026-09-21T10:00:00.000Z", created_at: "2026-09-21T10:00:00.000Z" });
    const older = patient(pid, { name: "Old Name", updated_at: "2026-09-20T10:00:00.000Z", created_at: "2026-09-20T10:00:00.000Z" });
    const r1 = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({ lastPulledAt: null, patients: [newer], visits: [] });
    expect(r1.status).toBe(200);
    const r2 = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({ lastPulledAt: null, patients: [older], visits: [] });
    expect(r2.status).toBe(200);
    const row = getDb().prepare("SELECT name FROM patients WHERE id=?").get(pid) as { name: string };
    expect(row.name).toBe("New Name");
  });

  it("missing consent is rejected", async () => {
    const login = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    const token = login.body.token;
    const pid = "44444444-4444-4444-8444-444444444444";
    const r = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({ lastPulledAt: null, patients: [patient(pid, { consent_given: 0 })], visits: [] });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("CONSENT_REQUIRED");
  });

  it("one worker cannot read another's data", async () => {
    const t1 = (await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" })).body.token;
    const t2 = (await request(app).post("/api/auth/login").send({ workerId: "w2", pin: "5678" })).body.token;
    const pid = "55555555-5555-4555-8555-555555555555";
    await request(app).post("/api/sync").set("Authorization", `Bearer ${t1}`).send({ lastPulledAt: null, patients: [patient(pid)], visits: [] });
    const r = await request(app).get(`/api/patients/${pid}`).set("Authorization", `Bearer ${t2}`);
    expect(r.status).toBe(404);
    const list = await request(app).get("/api/patients").set("Authorization", `Bearer ${t2}`);
    expect((list.body.patients as unknown[]).length).toBe(0);
  });

  it("server overrides client-supplied risk", async () => {
    const login = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    const token = login.body.token;
    const pid = "66666666-6666-4666-8666-666666666666";
    const vid = "77777777-7777-4777-8777-777777777777";
    await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({
      lastPulledAt: null,
      patients: [patient(pid)],
      visits: [visit(vid, pid, { systolic: 190, diastolic: 110, risk_level: "home", reason_codes: ["ALL_OK"], advice_key: "continue_home_care" })],
    });
    const row = getDb().prepare("SELECT risk_level, reason_codes FROM visits WHERE id=?").get(vid) as {
      risk_level: string;
      reason_codes: string;
    };
    expect(row.risk_level).toBe("urgent");
    expect(row.reason_codes).toContain("BP_CRISIS");
  });
});
