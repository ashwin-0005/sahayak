import bcrypt from "bcryptjs";
import fs from "node:fs";
import { closeDb, getDb } from "../src/db/client.js";

export function useTestDb(filename: string): void {
  const p = `./data/${filename}`;
  process.env.DB_PATH = p;
  closeDb();
  try {
    fs.unlinkSync(p);
  } catch { /* ignore */ }
  try {
    fs.unlinkSync(`${p}-wal`);
  } catch { /* ignore */ }
  try {
    fs.unlinkSync(`${p}-shm`);
  } catch { /* ignore */ }
  getDb();
}

export function seedWorker(id: string, pin: string, name = "Test Worker", village = "Testgaon"): void {
  const db = getDb();
  const hash = bcrypt.hashSync(pin, 10);
  db.prepare(
    "INSERT OR REPLACE INTO workers (id, name, village, pin_hash, created_at) VALUES (?,?,?,?,?)"
  ).run(id, name, village, hash, new Date().toISOString());
}

export function loginToken(app: unknown, workerId: string, pin: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return (import("supertest") as Promise<typeof import("supertest")>).then(({ default: request }) =>
    (request(app as never).post("/api/auth/login").send({ workerId, pin }) as unknown as Promise<{ body: { token: string } }>).then(
      (r) => r.body.token
    )
  );
}
