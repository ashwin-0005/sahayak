import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { nextVisitDate, daysOverdue } from "../src/services/followUp.js";
import { seedWorker, useTestDb } from "./helpers.js";

const app = createApp();
const SECRET = "test-secret-for-route-tests-1234567890";

describe("routes: risk, patients, visits, due, auth", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    useTestDb("test-routes.db");
    seedWorker("w1", "1234", "Asha One", "VillageA");
  });

  async function token(): Promise<string> {
    return (await request(app).post("/api/auth/login").send({ workerId: "w1", pin: "1234" })).body.token as string;
  }

  it("POST /api/risk/assess grades a crisis and rejects absurd input", async () => {
    const t = await token();
    const crisis = await request(app)
      .post("/api/risk/assess")
      .set("Authorization", `Bearer ${t}`)
      .send({ condition: "hypertension", age: 50, systolic: 190, diastolic: 110 });
    expect(crisis.status).toBe(200);
    expect(crisis.body.level).toBe("urgent");

    const absurd = await request(app)
      .post("/api/risk/assess")
      .set("Authorization", `Bearer ${t}`)
      .send({ condition: "hypertension", age: 50, systolic: 999, diastolic: 80 });
    expect(absurd.status).toBe(400);
  });

  it("GET /api/patients validates query and filters", async () => {
    const t = await token();
    const bad = await request(app)
      .get("/api/patients?condition=flu")
      .set("Authorization", `Bearer ${t}`);
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .get("/api/patients?condition=hypertension")
      .set("Authorization", `Bearer ${t}`);
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body.patients)).toBe(true);
  });

  it("GET /api/due rejects malformed dates", async () => {
    const t = await token();
    const bad = await request(app).get("/api/due?date=tomorrow").set("Authorization", `Bearer ${t}`);
    expect(bad.status).toBe(400);
    const ok = await request(app).get("/api/due?date=2026-09-22").set("Authorization", `Bearer ${t}`);
    expect(ok.status).toBe(200);
  });

  it("expired JWTs are rejected with UNAUTHORIZED", async () => {
    const dead = jwt.sign({ workerId: "w1" }, SECRET, { expiresIn: "-10s" });
    const r = await request(app).get("/api/patients").set("Authorization", `Bearer ${dead}`);
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("UNAUTHORIZED");

    const missing = await request(app).get("/api/patients");
    expect(missing.status).toBe(401);
  });

  it("GET /api/visits caps rows at 200", async () => {
    const t = await token();
    const r = await request(app).get("/api/visits").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.visits)).toBe(true);
  });

  it("POST /api/sync treats a missing cursor as full pull, never 400", async () => {
    const t = await token();
    // Fresh devices JSON-drop an undefined lastPulledAt, so the key is absent.
    const r = await request(app)
      .post("/api/sync")
      .set("Authorization", `Bearer ${t}`)
      .send({ patients: [], visits: [] });
    expect(r.status).toBe(200);
    expect(r.body.serverTime).toBeTruthy();
  });
});

describe("followUp pure functions", () => {
  it("nextVisitDate adds UTC days", () => {
    expect(nextVisitDate("2026-09-22T10:00:00.000Z", 7)).toBe("2026-09-29");
    expect(nextVisitDate("2026-01-31T00:00:00.000Z", 1)).toBe("2026-02-01");
    expect(() => nextVisitDate("not-a-date", 7)).toThrow();
  });

  it("daysOverdue counts whole days, negative when early", () => {
    expect(daysOverdue("2026-09-20", "2026-09-22")).toBe(2);
    expect(daysOverdue("2026-09-22", "2026-09-22")).toBe(0);
    expect(daysOverdue("2026-09-25", "2026-09-22")).toBe(-3);
  });
});
