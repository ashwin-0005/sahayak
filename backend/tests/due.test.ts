import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { getDb } from "../src/db/client.js";
import { seedWorker, useTestDb } from "./helpers.js";

const app = createApp();
const now = () => new Date().toISOString();

describe("due ordering", () => {
  let token = "";
  beforeEach(async () => {
    process.env.JWT_SECRET = "test-secret-for-due-tests-1234567890";
    useTestDb("test-due.db");
    seedWorker("w1", "1234", "Asha One", "VillageA");
    token = (await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" })).body.token;
    const db = getDb();
    const t = now();
    const mk = (id: string, name: string, next: string) =>
      db.prepare(
        `INSERT INTO patients (id, worker_id, name, age, sex, village, phone, "condition", language, consent_given, consent_at, next_visit_date, created_at, updated_at, deleted_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, "w1", name, 50, "F", "V", "9000000000", "hypertension", "en", 1, t, next, t, t, null);
    const mv = (id: string, pid: string, risk: string, at: string) =>
      db.prepare(
        `INSERT INTO visits (id, patient_id, worker_id, visited_at, systolic, diastolic, risk_level, reason_codes, advice_key, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, pid, "w1", at, 120, 80, risk, "[]", "continue_home_care", t, t);
    // urgent + very overdue, clinic + slightly overdue, home + very overdue
    mk("a0000000-0000-4000-8000-000000000001", "Urgent Ram", "2026-09-10");
    mk("a0000000-0000-4000-8000-000000000002", "Clinic Sita", "2026-09-18");
    mk("a0000000-0000-4000-8000-000000000003", "Home Gita", "2026-09-01");
    mv("b0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000001", "urgent", "2026-09-09T10:00:00.000Z");
    mv("b0000000-0000-4000-8000-000000000002", "a0000000-0000-4000-8000-000000000002", "clinic", "2026-09-17T10:00:00.000Z");
    mv("b0000000-0000-4000-8000-000000000003", "a0000000-0000-4000-8000-000000000003", "home", "2026-08-31T10:00:00.000Z");
  });

  it("sorts urgent first, then most overdue", async () => {
    const r = await request(app).get("/api/due?date=2026-09-20").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    const names = (r.body.patients as { name: string }[]).map((p) => p.name);
    expect(names).toEqual(["Urgent Ram", "Clinic Sita", "Home Gita"]);
    expect(r.body.patients[0].daysOverdue).toBe(10);
    expect(r.body.patients[0].lastRiskLevel).toBe("urgent");
  });

  it("excludes future due dates", async () => {
    const r = await request(app).get("/api/due?date=2026-09-05").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect((r.body.patients as unknown[]).length).toBe(1);
  });
});
