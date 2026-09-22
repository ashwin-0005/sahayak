import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

const DEFAULT_JWT_SECRET = "change-me-to-a-long-random-secret-in-production";

function parsePort(): number {
  const p = parseInt(process.env.PORT ?? "4000", 10);
  return Number.isNaN(p) ? 4000 : p;
}

export const config = {
  port: parsePort(),
  jwtSecret: requireEnv("JWT_SECRET", DEFAULT_JWT_SECRET),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  dbPath: process.env.DB_PATH ?? "./data/sahayak.db",
  isProd: process.env.NODE_ENV === "production",
};

const weakSecret = config.jwtSecret === DEFAULT_JWT_SECRET || config.jwtSecret.length < 32;
if (config.isProd && weakSecret) {
  // Fail closed: booting production with a public/guessable secret would let
  // anyone forge tokens for every account. Refuse instead of warning.
  throw new Error("Refusing to boot: set a strong JWT_SECRET (>= 32 chars) in production.");
}
if (weakSecret) {
  // eslint-disable-next-line no-console
  console.warn("[SECURITY WARNING] JWT_SECRET is weak. Set a strong JWT_SECRET in production!");
}

if (config.isProd && config.corsOrigin === "*") {
  // Fail closed: a wildcard CORS origin on a PHI API lets any website call it
  // with a stolen token. Set CORS_ORIGIN to the exact frontend origin.
  throw new Error("Refusing to boot: set CORS_ORIGIN to the frontend origin in production (never \"*\").");
}
