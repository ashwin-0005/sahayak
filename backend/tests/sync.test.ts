import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getDb } from "../src/db/client.js";
import { resetLoginLockout } from "../src/routes/auth.js";
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
    seedWorker("w3", "9999", "Asha Three", "VillageC");
    resetLoginLockout();
  });

  // The login rate limiter (10/15min per IP) is shared across this file, so
  // reuse one token per worker. Tokens stay valid: every test reseeds the
  // same ids/pins under the same JWT secret.
  const tokenCache = new Map<string, string>();
  async function tokenFor(workerId: string, pin: string): Promise<string> {
    const key = `${workerId}:${pin}`;
    let t = tokenCache.get(key);
    if (!t) {
      t = (await request(app).post("/api/auth/login").send({ workerId, pin })).body.token as string;
      tokenCache.set(key, t);
    }
    return t;
  }

  it("login works and rejects bad pin", async () => {
    const ok = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "0000" });
    expect(bad.status).toBe(401);
  });

  it("locks an account after 5 wrong PINs, even for the right PIN", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post("/api/auth/login").send({ workerId: "w3", pin: "0000" });
      expect(r.status).toBe(401);
    }
    const locked = await request(app).post("/api/auth/login").send({ workerId: "w3", pin: "9999" });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("sync upserts + is idempotent on replay", async () => {
    const token = await tokenFor("w1", "1234");
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
    expect((r1.body.results as { status: string }[]).every((x) => x.status === "accepted")).toBe(true);
    const count1 = (getDb().prepare("SELECT COUNT(*) c FROM visits").get() as { c: number }).c;
    const r2 = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send(payload);
    expect(r2.status).toBe(200);
    const count2 = (getDb().prepare("SELECT COUNT(*) c FROM visits").get() as { c: number }).c;
    expect(count2).toBe(count1);
  });

  it("older record is ignored (last-write-wins)", async () => {
    const token = await tokenFor("w1", "1234");
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

  it("equal timestamps converge on the server row (documented tiebreak)", async () => {    const token = await tokenFor("w1", "1234");
    const pid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const ts = "2026-09-21T10:00:00.000Z";
    await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({
      lastPulledAt: null, patients: [patient(pid, { name: "Server Name", updated_at: ts, created_at: ts })], visits: [],
    });
    const r = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({
      lastPulledAt: null, patients: [patient(pid, { name: "Client Tie", updated_at: ts, created_at: ts })], visits: [],
    });
    expect(r.status).toBe(200);
    expect(r.body.results[0].status).toBe("accepted");
    const row = getDb().prepare("SELECT name FROM patients WHERE id=?").get(pid) as { name: string };
    expect(row.name).toBe("Server Name");
  });

  it("missing consent is rejected per record without blocking the batch", async () => {
    const token = await tokenFor("w1", "1234");
    const badPid = "44444444-4444-4444-8444-444444444444";
    const goodPid = "44444444-4444-4444-8444-444444444445";
    const r = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({ lastPulledAt: null, patients: [patient(badPid, { consent_given: 0 }), patient(goodPid)], visits: [] });
    expect(r.status).toBe(200);
    const byId = Object.fromEntries((r.body.results as { id: string; status: string; code?: string }[]).map((x) => [x.id, x]));
    expect(byId[badPid].status).toBe("rejected");
    expect(byId[badPid].code).toBe("CONSENT_REQUIRED");
    expect(byId[goodPid].status).toBe("accepted");
    const row = getDb().prepare("SELECT id FROM patients WHERE id=?").get(goodPid);
    expect(row).toBeTruthy();
    const missing = getDb().prepare("SELECT id FROM patients WHERE id=?").get(badPid);
    expect(missing).toBeFalsy();
  });

  it("absurd timestamps are rejected per record", async () => {
    const token = await tokenFor("w1", "1234");
    const pid = "88888888-8888-4888-8888-888888888888";
    const r = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({ lastPulledAt: null, patients: [patient(pid, { updated_at: "2099-01-01T00:00:00.000Z" })], visits: [] });
    expect(r.status).toBe(200);
    expect(r.body.results[0].status).toBe("rejected");
    expect(r.body.results[0].code).toBe("INVALID_TIMESTAMP");
  });

  it("cross-worker and unknown-patient writes are rejected per record", async () => {
    const t1 = await tokenFor("w1", "1234");
    const t2 = await tokenFor("w2", "5678");
    const pid = "99999999-9999-4999-8999-999999999999";
    await request(app).post("/api/sync").set("Authorization", `Bearer ${t1}`).send({ lastPulledAt: null, patients: [patient(pid)], visits: [] });
    const vid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const r = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${t2}`)
      .send({
        lastPulledAt: null,
        patients: [patient(pid, { name: "Hijack" })],
        visits: [visit(vid, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")],
      });
    expect(r.status).toBe(200);
    const byId = Object.fromEntries((r.body.results as { id: string; status: string; code?: string }[]).map((x) => [x.id, x]));
    expect(byId[pid].status).toBe("rejected");
    expect(byId[pid].code).toBe("FORBIDDEN");
    expect(byId[vid].status).toBe("rejected");
    expect(byId[vid].code).toBe("UNKNOWN_PATIENT");
  });

  it("one worker cannot read another's data", async () => {
    const t1 = await tokenFor("w1", "1234");
    const t2 = await tokenFor("w2", "5678");
    const pid = "55555555-5555-4555-8555-555555555555";
    await request(app).post("/api/sync").set("Authorization", `Bearer ${t1}`).send({ lastPulledAt: null, patients: [patient(pid)], visits: [] });
    const r = await request(app).get(`/api/patients/${pid}`).set("Authorization", `Bearer ${t2}`);
    expect(r.status).toBe(404);
    const list = await request(app).get("/api/patients").set("Authorization", `Bearer ${t2}`);
    expect((list.body.patients as unknown[]).length).toBe(0);
  });

  it("server overrides client-supplied risk", async () => {
    const token = await tokenFor("w1", "1234");
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

  it("rejects physically impossible readings per record", async () => {
    const token = await tokenFor("w1", "1234");
    const pid = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const vid = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const r = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({
      lastPulledAt: null,
      patients: [patient(pid)],
      visits: [visit(vid, pid, { systolic: 999 })],
    });
    expect(r.status).toBe(200);
    const byId = Object.fromEntries((r.body.results as { id: string; status: string; code?: string }[]).map((x) => [x.id, x]));
    expect(byId[pid].status).toBe("accepted");
    expect(byId[vid].status).toBe("rejected");
    expect(byId[vid].code).toBe("INVALID_RECORD");
  });

  it("persists the plausibility override flag and writes audit rows", async () => {
    const token = await tokenFor("w1", "1234");
    const pid = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const vid = "00000000-0000-4000-8000-000000000000";
    const r = await request(app).post("/api/sync").set("Authorization", `Bearer ${token}`).send({
      lastPulledAt: null,
      patients: [patient(pid)],
      visits: [visit(vid, pid, { systolic: 190, diastolic: 110, override: 1 })],
    });
    expect(r.status).toBe(200);
    const vrow = getDb().prepare("SELECT override, risk_level FROM visits WHERE id=?").get(vid) as {
      override: number;
      risk_level: string;
    };
    expect(vrow.override).toBe(1);
    expect(vrow.risk_level).toBe("urgent");
    const audits = getDb()
      .prepare("SELECT action, table_name, actor_worker_id FROM audit_log WHERE record_id=? ORDER BY created_at")
      .all(vid) as { action: string; table_name: string; actor_worker_id: string }[];
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0]).toMatchObject({ action: "insert", table_name: "visits", actor_worker_id: "w1" });
    const paudits = getDb()
      .prepare("SELECT COUNT(*) c FROM audit_log WHERE record_id=? AND table_name='patients'")
      .get(pid) as { c: number };
    expect(paudits.c).toBeGreaterThanOrEqual(1);
  });
});
