import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDb, getDb } from "./db/client.js";
import { ensureSeeded } from "./seed/seed.js";

getDb(); // ensure schema exists
// Re-seed on every boot when empty: hosting disks can be ephemeral, and a
// restart without a rebuild must not leave logins broken. Idempotent —
// skips the moment any worker exists, so synced data is never touched.
ensureSeeded();
const app = createApp();

// Bind all interfaces so the server is reachable on hosting platforms.
// Port comes from the environment via config (PORT, default 4000).
const host = process.env.HOST ?? "0.0.0.0";
const server = app.listen(config.port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Sahayak backend listening on ${host}:${config.port}`);
});

// Graceful shutdown: finish in-flight requests, then close SQLite cleanly so
// a deploy restart can't truncate WAL or a half-written sync transaction.
function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, closing...`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Force out if connections hang (e.g. a 90s client timeout in flight).
  setTimeout(() => {
    closeDb();
    process.exit(0);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
