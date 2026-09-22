import { test, expect } from "@playwright/test";

// Demo login flow against a real backend (fresh e2e database, auto-seeded on
// boot) and the production frontend build. Run: build the frontend with
// VITE_API_URL pointing at the e2e backend first (see playwright.config.ts).
test.describe("demo login flow", () => {
  test("landing -> demo -> dashboard -> refresh -> logout", async ({ page }) => {
    // Landing advertises only the isolated demo account.
    await page.goto("/");
    await expect(page.getByText("Sahayak")).toBeVisible();
    await page.getByRole("button", { name: /Try the demo/i }).click();
    await expect(page.getByText("Demo ID: demo")).toBeVisible();
    await expect(page.getByText("PIN: 0000")).toBeVisible();
    await expect(page.getByText("asha001")).toHaveCount(0);

    // Demo button pre-fills the worker ID on the login screen.
    await page.getByRole("button", { name: /Open login with demo ID/i }).click();
    await expect(page.getByLabel("Worker ID")).toHaveValue("demo");

    // Correct demo PIN reaches the dashboard.
    for (const _ of [0, 1, 2, 3]) {
      await page.getByRole("button", { name: "0", exact: true }).click();
    }
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText(/Good day/i)).toBeVisible({ timeout: 30000 });

    // Session survives a full page reload.
    await page.reload();
    await expect(page.getByText(/Good day/i)).toBeVisible({ timeout: 15000 });

    // Logout wipes the session and returns to login.
    await page.getByRole("link", { name: /Settings/i }).click();
    await page.getByRole("button", { name: /Log out of this device/i }).click();
    await expect(page.getByRole("button", { name: "Unlock" })).toBeVisible({ timeout: 15000 });
  });

  test("wrong PIN shows a non-sensitive error, never a crash", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Worker ID").fill("demo");
    for (const _ of [0, 1, 2, 3]) {
      await page.getByRole("button", { name: "9", exact: true }).click();
    }
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("alert")).toContainText(/Incorrect worker ID or PIN/);
    // Still on the login screen — no redirect, no hang.
    await expect(page.getByRole("button", { name: "Unlock" })).toBeVisible();
  });
});
