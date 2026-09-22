import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "./db/db.js";
import { setMeta } from "./db/repo";
import "./i18n";
import App from "./App";

function sessionMeta() {
  return {
    workerId: "asha001",
    worker: { id: "asha001", name: "Meera", village: "Sanwer" },
    token: "tok",
    salt: "s",
    pinHash: "h",
    kdf: "pbkdf2-sha256-100k",
    failedAttempts: 0,
    lockedUntil: null
  };
}

beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.quarantine, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.quarantine.clear();
    await db.meta.clear();
  });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RequireAuth route guard", () => {
  it("redirects an unauthenticated visit to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("redirects a locked session to /login", async () => {
    await setMeta("auth", sessionMeta());
    await setMeta("locked", true);
    render(
      <MemoryRouter initialEntries={["/patients"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("lets an authenticated, unlocked session reach the dashboard", async () => {
    await setMeta("auth", sessionMeta());
    await setMeta("locked", false);
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Good day/)).toBeInTheDocument();
  });
});
