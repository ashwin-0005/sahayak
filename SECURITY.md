# Security Policy

Sahayak handles patient health data. If you find a security issue, please
report it responsibly so we can fix it before it affects field workers.

## Reporting a vulnerability

- **Do not** open a public GitHub issue for security problems.
- Email the maintainer privately with a description, steps to reproduce, and
  the commit or deployment you tested against.
- We will acknowledge within 7 days and aim to ship a fix within 30 days.

## What we already do

- Worker PINs are stored server-side as bcrypt hashes (never plaintext).
- All SQL uses parameterized queries; all data routes require a JWT and are
  worker-isolated (cross-worker reads return 404, cross-worker writes 403).
- The server recomputes clinical risk on every sync — client values are ignored.
- The API never logs request bodies; error responses never include stack traces
  in production.
- The offline PIN check uses a slow salted hash (PBKDF2-SHA256, 100k
  iterations) with a 5-attempt device lockout.
- Production refuses to boot with a default/weak `JWT_SECRET` or a wildcard
  `CORS_ORIGIN`; login is additionally locked per account (5 wrong PINs).
- Every accepted write lands in an append-only `audit_log`
  (actor, action, record, timestamp); plausibility overrides are flagged.
- Deploy restarts drain in-flight requests and close SQLite cleanly (SIGTERM).

## Known limitations (see audit report)

- Patient data at rest (IndexedDB on device, SQLite on server) is not
  separately encrypted — it relies on OS-level device encryption and server
  disk security. Use managed devices with screen lock for field deployment.
- Risk thresholds in `riskEngine.ts` are demo values and MUST be validated
  against current national guidelines (NHM / WHO HEARTS / PMSMA) before any
  real clinical use.
- Demo credentials (`asha001/1234`, `asha002/5678`) ship in the seed script
  for evaluation only. Disable or rotate them before any production use.
