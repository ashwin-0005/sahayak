import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getDb } from "../src/db/client.js";
import { ensureSeeded } from "../src/seed/seed.js";
import { useTestDb } from "./helpers.js";

const app = createApp();

describe("seed: idempotent demo bootstrap", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-for-seed-tests-1234567890";
    useTestDb("test-seed.db");
  });

  it("seeds workers including the isolated demo account, then never wipes", async () => {
    ensureSeeded();
    const workers = getDb().prepare("SELECT id FROM workers ORDER BY id").all() as { id: string }[];
    expect(workers.map((w) => w.id)).toEqual(["asha001", "asha002", "demo"]);

    const demoPatients = getDb()
      .prepare("SELECT COUNT(*) c FROM patients WHERE worker_id='demo'")
      .get() as { c: number };
    expect(demoPatients.c).toBe(3);

    // Second run is a no-op: counts identical, no wipe.
    const before = (getDb().prepare("SELECT COUNT(*) c FROM patients").get() as { c: number }).c;
    ensureSeeded();
    const after = (getDb().prepare("SELECT COUNT(*) c FROM patients").get() as { c: number }).c;
    expect(after).toBe(before);
  });

  it("demo login works and demo data stays worker-isolated", async () => {
    ensureSeeded();
    const login = await request(app).post("/api/auth/login").send({ workerId: "demo", pin: "0000" });
    expect(login.status).toBe(200);
    expect(login.body.worker.id).toBe("demo");

    const list = await request(app).get("/api/patients").set("Authorization", `Bearer ${login.body.token}`);
    expect(list.status).toBe(200);
    const ids = new Set((list.body.patients as { worker_id: string }[]).map((p) => p.worker_id));
    expect(ids).toEqual(new Set(["demo"]));
  });
});
