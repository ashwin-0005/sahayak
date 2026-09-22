# Sahayak — Frontend

Offline-first follow-up & adherence PWA for community health workers (ASHA-style),
paired with the backend in `../backend`.

## Stack
- Vite + React 18 + TypeScript (strict)
- React Router, Tailwind, Dexie (IndexedDB), react-i18next (en/hi)
- vite-plugin-pwa (Workbox, `registerType: autoUpdate`), Recharts, lucide-react
- Vitest + Testing Library

## Commands
```bash
npm install        # install deps
npm run dev        # dev server (http://localhost:5173)
npm run build      # production build + PWA precache (dist/)
npm run preview    # serve dist/ (verify SW + offline launch)
npm run icons      # regenerate PWA icons from public/icons/*.svg
npm test           # vitest run
npm run typecheck  # tsc --noEmit
```

## Config
- `VITE_API_URL` (default `http://localhost:4000`, see `.env.example`) — backend base URL.

## How data flows
- **Dexie** is the single source of truth on-device (patients, visits, outbox, meta).
  Patient/visit rows keep the backend's **snake_case** shape, so sync maps 1:1.
- **Outbox**: every local write (new patient, visit, visit roll-forward) enqueues a
  JSON snapshot (worker_id stripped). Push happens once per sync; the server
  acknowledges **per record**, and only acked rows are removed from the outbox.
  Rejected or corrupt rows move to a visible **quarantine** list ("Sync issues")
  instead of blocking or vanishing.
- **Sync** (`src/sync/syncEngine.ts`): one `syncNow()` entry point, guarded against
  concurrency. Triggers: app start (+800ms), `online` event, 60s interval, and the
  manual "Sync now" buttons. Exponential backoff 5s → 5min cap. Last-write-wins on
  `updated_at`; the server always recomputes risk, so server risk fields win.
- **Offline unlock**: the worker's PIN is never stored. On first (online) login we
  cache `pinHash = sha256(salt + ":" + pin)` where `salt = workerId + ":" + uuid`.
  Offline unlock compares against that hash; no network needed.
- **Consent**: registering a patient requires the consent sheet; `consent_given`
  is set only after the worker confirms.

## Routes
- `/` (landing, public) · `/login` · `/home` (dashboard + due list) · `/patients` · `/patients/new`
- `/patients/:id` · `/visits/:patientId/new` · `/risk/result` · `/reminders/:patientId` · `/settings`

## Tests
- `src/risk/riskEngine.test.ts` — **parity**: runs identical inputs through the
  backend's risk engine and the client copy; outcomes must match exactly.
- `src/db/repo.test.ts` — outbox enqueue/clear + LWW + server-risk-wins.
- `src/sync/syncEngine.test.ts` — push (no worker_id), apply pulled rows, outbox
  survives rejection, meta timestamps.
- `src/i18n/keys.test.ts` — en/hi key parity.
- `src/pages/PatientNew.test.tsx` — consent gate blocks/permits saving.
- `src/pages/Login.test.tsx` + `src/pages/Home.test.tsx` — cold-start wake
  notice, cache-first render.
- `src/lib/retry.test.ts` + `src/lib/useSlow.test.ts` — retry/backoff helpers.

Use `fake-indexeddb` (already configured in `vitest.setup.ts`).

## Assumptions
- **WhatsApp reminder**: `wa.me` link uses digits-only phone (non-digits
  stripped); the backend does the same.
- **"Reset demo data"** (Settings) wipes local Dexie data **and** resets sync
  state so the next sync re-pulls everything; sync-mirrored data on the server
  is untouched. **"Log out"** wipes all local data including the session.
- **Offline verification** is done via the production build + Workbox precache
  inspection (a CLI cannot toggle airplane mode), i.e. `npm run build && npm run preview`.
- Risk thresholds are demo values; they must be validated against national
  guidelines before real clinical use (same caveat as the backend README).