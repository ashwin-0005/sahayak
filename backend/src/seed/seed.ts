import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { assessRisk, type Condition } from "../services/riskEngine.js";
import { nextVisitDate } from "../services/followUp.js";

// Deterministic PRNG for reproducible demo data
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260921);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min;

const VILLAGES = ["Sanwer", "Depalpur", "Betma", "Hatod", "Rau", "Mhow"];
const NAMES_F = ["Meera Yadav", "Sunita Patel", "Rekha Verma", "Asha Chouhan", "Lakshmi Malviya", "Priya Sharma", "Kavita Rathore", "Sangeeta Patidar", "Usha Nagar", "Anita Joshi", "Pooja Mukati", "Rina Dangi"];
const NAMES_M = ["Ramesh Patel", "Mohan Verma", "Suresh Chouhan", "Anil Patidar", "Rajesh Sharma", "Vikram Singh", "Arjun Malviya", "Kailash Yadav", "Dinesh Nagar", "Prakash Dangi"];
const CONDITIONS: Condition[] = [
  "hypertension", "hypertension", "hypertension", "hypertension", "hypertension", "hypertension", "hypertension",
  "diabetes", "diabetes", "diabetes", "diabetes", "diabetes", "diabetes", "diabetes",
  "tb", "tb", "tb", "tb", "tb",
  "pregnancy", "pregnancy", "pregnancy", "pregnancy", "pregnancy", "pregnancy",
];

function phone(): string {
  return `9${String(int(800000000, 989999999))}`;
}

export function ensureSeeded(): void {
  const db = getDb();
  const now = new Date().toISOString();

  // Idempotent: safe to call on every boot. If workers already exist the
  // database was seeded before — never wipe real/synced data by re-running.
  // (Production disks can be ephemeral: a restart without a rebuild would
  // otherwise leave an empty database and break every login.)
  const existingWorkers = (db.prepare("SELECT COUNT(*) c FROM workers").get() as { c: number }).c;
  if (existingWorkers > 0) {
    // eslint-disable-next-line no-console
    console.log(`Seed skipped: ${existingWorkers} worker(s) already exist.`);
    return;
  }

  db.prepare("DELETE FROM visits").run();
  db.prepare("DELETE FROM patients").run();
  db.prepare("DELETE FROM workers").run();

  const workers = [
    { id: "asha001", name: "Meera Yadav", village: "Sanwer", pin: "1234" },
    { id: "asha002", name: "Sunita Patel", village: "Depalpur", pin: "5678" },
    // Public demo account: isolated demo-only workspace, advertised on the
    // landing page. Real-looking worker IDs stay out of public UI.
    { id: "demo", name: "Demo Worker", village: "Demo Village", pin: "0000" },
  ];
  for (const w of workers) {
    db.prepare("INSERT INTO workers (id, name, village, pin_hash, created_at) VALUES (?,?,?,?,?)").run(
      w.id, w.name, w.village, bcrypt.hashSync(w.pin, 10), now
    );
  }

  // 8 indices forced overdue (old last visit)
  const overdueIdx = new Set([1, 4, 7, 10, 13, 16, 19, 22]);

  CONDITIONS.forEach((condition, i) => {
    const workerId = i % 2 === 0 ? "asha001" : "asha002";
    const sex = condition === "pregnancy" ? "F" : rand() < 0.5 ? "F" : "M";
    const name = sex === "F" ? NAMES_F[i % NAMES_F.length] : NAMES_M[i % NAMES_M.length];
    const age = condition === "pregnancy" ? int(19, 35) : condition === "tb" ? int(18, 60) : int(35, 75);
    const pid = randomUUID();
    const lang = rand() < 0.5 ? "hi" : "en";
    const t = now;

    db.prepare(
      `INSERT INTO patients (id, worker_id, name, age, sex, village, phone, "condition", language, consent_given, consent_at, next_visit_date, created_at, updated_at, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(pid, workerId, `${name.split(" ")[0]} ${["Devi", "Bai", "Kumar", "Singh", "Patel"][i % 5]}`, age, sex,
      pick(VILLAGES), phone(), condition, lang, 1, t, null, t, t, null);

    const nVisits = int(3, 6);
    // trending worse for every 4th patient
    const worsening = i % 4 === 1;
    let lastDate = new Date();
    lastDate.setUTCDate(lastDate.getUTCDate() - (overdueIdx.has(i) ? int(35, 70) : int(5, 25)));

    // spread earlier visits backwards
    const dates: Date[] = [];
    const d0 = new Date(lastDate);
    for (let k = nVisits - 1; k >= 0; k--) {
      const d = new Date(d0);
      d.setUTCDate(d.getUTCDate() - k * int(14, 30));
      dates.push(d);
    }

    let finalNext = "";
    dates.forEach((d, k) => {
      const progress = dates.length <= 1 ? 1 : k / (dates.length - 1); // 0..1
      let systolic: number | null = null;
      let diastolic: number | null = null;
      let sugar: number | null = null;
      let sugarType: "fasting" | "random" | null = null;
      let missed = 0;
      let symptoms: string[] = [];

      if (condition === "hypertension" || condition === "pregnancy" || (condition === "diabetes" && rand() < 0.6) || (condition === "tb" && rand() < 0.4)) {
        const base = worsening ? 125 + progress * 45 : 118 + rand() * 20;
        systolic = Math.round(base + (rand() * 8 - 4));
        diastolic = Math.round(systolic * 0.62 + (rand() * 6 - 3));
      }
      if (condition === "diabetes") {
        sugarType = rand() < 0.5 ? "fasting" : "random";
        const base = worsening ? 130 + progress * 130 : 110 + rand() * 60;
        sugar = Math.round(base);
      }
      if (rand() < 0.25) missed = int(1, 5);
      if (worsening && k === dates.length - 1) {
        if (condition === "hypertension") { systolic = 185; diastolic = 115; }
        if (condition === "diabetes") { sugar = 320; sugarType = "random"; }
        if (condition === "tb") missed = 4;
        if (rand() < 0.5) symptoms = ["breathlessness"];
      }

      const risk = assessRisk({
        condition, age,
        systolic, diastolic,
        sugarMgDl: sugar, sugarType,
        medicineTaken: missed > 0 ? false : true,
        missedDoses: missed, symptoms,
      });
      const visitedAt = d.toISOString();
      const vid = randomUUID();
      db.prepare(
        `INSERT INTO visits (id, patient_id, worker_id, visited_at, systolic, diastolic, sugar_mg_dl, sugar_type, medicine_taken, missed_doses, symptoms, notes, risk_level, reason_codes, advice_key, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(vid, pid, workerId, visitedAt, systolic, diastolic, sugar, sugarType,
        missed > 0 ? 0 : 1, missed, JSON.stringify(symptoms), null,
        risk.level, JSON.stringify(risk.reasonCodes), risk.adviceKey, visitedAt, visitedAt);
      finalNext = nextVisitDate(visitedAt.slice(0, 10), risk.nextVisitInDays);
    });

    db.prepare("UPDATE patients SET next_visit_date=?, updated_at=? WHERE id=?").run(finalNext, now, pid);
  });

  // Demo-only workspace for the public "demo" account: small, clearly
  // synthetic, and isolated by worker_id like everything else.
  seedDemoWorkspace(db, now);

  const nP = (db.prepare("SELECT COUNT(*) c FROM patients").get() as { c: number }).c;
  const nV = (db.prepare("SELECT COUNT(*) c FROM visits").get() as { c: number }).c;
  // eslint-disable-next-line no-console
  console.log(`Seeded ${nP} patients, ${nV} visits.`);
  // NOTE: demo credentials live in README + the landing page by design, but
  // never print secrets to stdout — CI/deploy logs are retained and shared.
}

// Runs only when this file is executed directly (`npm run seed` / tsx /
// node dist/...). Importing it (e.g. server boot) must stay side-effect free.
const invokedDirectly = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("seed/seed.ts") ||
  (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("seed/seed.js");
if (invokedDirectly) ensureSeeded();

function seedDemoWorkspace(db: ReturnType<typeof getDb>, now: string): void {
  const demoPatients: { name: string; age: number; sex: string; condition: Condition; daysAgo: number; systolic: number | null; diastolic: number | null; sugar: number | null; sugarType: "fasting" | "random" | null }[] = [
    { name: "Demo Devi", age: 52, sex: "F", condition: "hypertension", daysAgo: 40, systolic: 182, diastolic: 112, sugar: null, sugarType: null },
    { name: "Demo Kumar", age: 48, sex: "M", condition: "diabetes", daysAgo: 10, systolic: null, diastolic: null, sugar: 210, sugarType: "random" },
    { name: "Demo Bai", age: 26, sex: "F", condition: "pregnancy", daysAgo: 5, systolic: 118, diastolic: 76, sugar: null, sugarType: null },
  ];
  for (const p of demoPatients) {
    const pid = randomUUID();
    db.prepare(
      `INSERT INTO patients (id, worker_id, name, age, sex, village, phone, "condition", language, consent_given, consent_at, next_visit_date, created_at, updated_at, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(pid, "demo", p.name, p.age, p.sex, "Demo Village", "9000000000", p.condition, "en", 1, now, null, now, now, null);
    const visited = new Date(now);
    visited.setUTCDate(visited.getUTCDate() - p.daysAgo);
    const visitedAt = visited.toISOString();
    const risk = assessRisk({
      condition: p.condition, age: p.age,
      systolic: p.systolic, diastolic: p.diastolic,
      sugarMgDl: p.sugar, sugarType: p.sugarType,
      medicineTaken: true, missedDoses: 0, symptoms: [],
    });
    db.prepare(
      // override omitted: DEFAULT 0 (no plausibility warning was overridden).
      `INSERT INTO visits (id, patient_id, worker_id, visited_at, systolic, diastolic, sugar_mg_dl, sugar_type, medicine_taken, missed_doses, symptoms, notes, risk_level, reason_codes, advice_key, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(randomUUID(), pid, "demo", visitedAt, p.systolic, p.diastolic, p.sugar, p.sugarType,
      1, 0, "[]", "Seeded demo visit", risk.level, JSON.stringify(risk.reasonCodes), risk.adviceKey, visitedAt, visitedAt);
    db.prepare("UPDATE patients SET next_visit_date=?, updated_at=? WHERE id=?")
      .run(nextVisitDate(visitedAt.slice(0, 10), risk.nextVisitInDays), now, pid);
  }
}
