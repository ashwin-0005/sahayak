import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  jwtSecret: requireEnv("JWT_SECRET", "change-me-to-a-long-random-secret-in-production"),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  dbPath: process.env.DB_PATH ?? "./data/sahayak.db",
  isProd: process.env.NODE_ENV === "production",
};

if (config.jwtSecret === "change-me-to-a-long-random-secret-in-production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[SECURITY WARNING] JWT_SECRET is the default value. Set a strong JWT_SECRET in production!"
  );
}
