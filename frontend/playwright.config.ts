import { defineConfig, devices } from "@playwright/test";

// End-to-end: real backend (fresh e2e database, auto-seeded on boot via
// ensureSeeded) + production frontend build.
//
// One-time setup before running:
//   1. cd backend && npm run build
//   2. cd frontend && VITE_API_URL=http://localhost:4100 npm run build
//      (PowerShell: $env:VITE_API_URL="http://localhost:4100"; npm run build)
//   3. npx playwright install chromium
// Then: npx playwright test
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node dist/index.js",
      cwd: "../backend",
      port: 4100,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      env: {
        PORT: "4100",
        DB_PATH: "./data/e2e-demo.db",
        JWT_SECRET: "e2e-demo-secret-0123456789abcdef",
        CORS_ORIGIN: "http://localhost:5199"
      }
    },
    {
      command: "npx vite preview --port 5199 --strictPort",
      port: 5199,
      reuseExistingServer: !process.env.CI
    }
  ]
});
