# Sahayak Backend

Offline-first follow-up and adherence backend for community health workers (ASHA-style demo). All data is **synthetic**.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # optional; defaults work for demo
npm run seed           # also runs automatically on every boot when the DB is empty
npm run dev            # http://localhost:4000
```

Demo accounts (synthetic data only): the public **`demo` / `0000`** account
(isolated demo workspace, advertised in the app) plus dev-only
`asha001/1234` and `asha002/5678`. Seeding is idempotent — it skips the
moment any worker exists, so production/synced data is never wiped.

Env vars (`src/config.ts`, defaults in parentheses):

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `4000` | HTTP port |
| `JWT_SECRET` | `change-me-...` | JWT signing key (12h expiry). **Production refuses to boot** with the default or any secret < 32 chars. |
| `CORS_ORIGIN` | `*` | CORS origin. **Production refuses to boot** with `*` — set the exact frontend origin. |
| `DB_PATH` | `./data/sahayak.db` | SQLite file (auto-created) |

Production also requires `NODE_ENV=production` and TLS termination at the
host (Render/Vercel provide this); the API itself serves plain HTTP. Login is
additionally guarded per account: 5 wrong PINs lock that worker for 15 min
(`ACCOUNT_LOCKED`), on top of the 10/15min/IP limiter.

Scripts: `npm run dev` (tsx watch), `npm run build` + `npm start` (prod), `npm test` (vitest), `npm run seed`.

## API (prefix `/api`, errors shaped `{ error: { code, message, details? } }`)

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/health` | no | `{ status, time }` |
| `POST /api/auth/login` | no (10/15min/IP) | `{ workerId, pin }` → `{ token, worker }` |
| `POST /api/sync` | Bearer | Offline push/pull (see below) |
| `GET /api/patients?search=&condition=` | Bearer | Own patients, excludes soft-deleted |
| `GET /api/patients/:id` | Bearer | Patient + visits ordered by date |
| `GET /api/visits?patient_id=` | Bearer | Visit reader (writes via sync) |
| `GET /api/due?date=YYYY-MM-DD` | Bearer | `next_visit_date <= date` + `daysOverdue,lastRiskLevel`, urgent-first |
| `POST /api/risk/assess` | Bearer | Run `assessRisk` on body |
| `GET /api/reminders/:patientId?lang=en\|hi` | Bearer | `{ message, whatsappUrl, smsUrl, kind }` |

### Curl walkthrough (against seeded data)

```bash
# 1. health
curl http://localhost:4000/api/health

# 2. login (demo PINs: asha001/1234, asha002/5678)
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"workerId":"asha001","pin":"1234"}'

export TOKEN=<token-from-above>

# 3. sync (empty push, pull everything)
curl -X POST http://localhost:4000/api/sync \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"lastPulledAt":null,"patients":[],"visits":[]}'

# 4. due list
curl "http://localhost:4000/api/due?date=2026-09-21" -H "Authorization: Bearer $TOKEN"

# 5. patients + detail
curl "http://localhost:4000/api/patients?condition=diabetes" -H "Authorization: Bearer $TOKEN"
PID=$(curl -s "http://localhost:4000/api/patients" -H "Authorization: Bearer $TOKEN" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).patients[0].id")
curl "http://localhost:4000/api/patients/$PID" -H "Authorization: Bearer $TOKEN"

# 6. risk check + reminder (English + Hindi)
curl -X POST http://localhost:4000/api/risk/assess \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"condition":"hypertension","age":55,"systolic":185,"diastolic":115}'
curl "http://localhost:4000/api/reminders/$PID?lang=hi" -H "Authorization: Bearer $TOKEN"
```

Sync semantics: one SQLite transaction; upsert by `id` with **last-write-wins on `updated_at`**; `consent_given` must be true; visit risk is **recomputed server-side** (client risk ignored); `patients.next_visit_date` updated from each visit; idempotent replay; pull = everything with `updated_at > lastPulledAt` for that worker (incl. soft-deleted).

## Design decisions

- **SQLite via better-sqlite3**, plain SQL kept portable for a later Postgres move.
- **Offline-first sync**: client UUIDs, LWW timestamps, single transaction, idempotent.
- **Worker isolation**: every query scoped by JWT `workerId`; cross-worker access → 404/403.
- **Risk engine is pure** (`services/riskEngine.ts`, no I/O) so PWA can share logic; conservative escalation.
- **Soft deletes only** (`deleted_at`); list endpoints exclude them, sync still returns them.
- **Privacy**: helmet, CORS, 1mb body limit, no PII in logs, no stacks in prod, PINs bcrypt-hashed, consent enforced.

## Clinical-safety note

Risk thresholds are **demo values for a hackathon** and must be validated against current national guidelines (NHM / WHO HEARTS / PMSMA) before any real use. When in doubt the engine escalates. This tool supports — never replaces — trained health workers.

## Assumptions

- Client generates UUIDs for patients/visits; `updated_at` is trustworthy enough for LWW demo.
- 4-digit demo PINs; JWT 12h; `wa.me` links need digits-only phones.
- `serverTime` is ISO-8601 UTC; `next_visit_date` is `YYYY-MM-DD`.
- Seed puts ~8 patients overdue relative to Sep 2026 for a useful demo.
