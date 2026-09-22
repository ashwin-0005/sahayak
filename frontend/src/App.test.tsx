import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { db } from "./db/db.js";
import { getMeta, setMeta } from "./db/repo";
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

  it("keeps the session across a remount (page refresh)", async () => {
    await setMeta("auth", sessionMeta());
    await setMeta("locked", false);
    const first = render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Good day/)).toBeInTheDocument();
    first.unmount();
    // Simulate a full page reload: fresh React tree, same IndexedDB.
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Good day/)).toBeInTheDocument();
  });
});

describe("demo flow: landing -> login -> dashboard -> logout", () => {
  const loginBody = {
    token: "tok-demo",
    worker: { id: "demo", name: "Demo Worker", village: "Demo Village" }
  };

  function stubApi() {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).includes("/api/auth/login")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(loginBody) });
        }
        if (String(url).includes("/api/health")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: "ok", time: new Date().toISOString() }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ patients: [], visits: [], serverTime: new Date().toISOString(), results: [] })
        });
      })
    );
  }

  it("demo button pre-fills the ID and a correct PIN reaches the dashboard", async () => {
    stubApi();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    // Landing advertises only the isolated demo account — never worker IDs.
    await user.click(screen.getByRole("button", { name: /Try the demo/i }));
    expect(screen.queryByText(/asha001/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /Open login with demo ID/i }));

    expect(screen.getByLabelText("Worker ID")).toHaveValue("demo");
    for (const d of ["0", "0", "0", "0"]) {
      await user.click(screen.getByRole("button", { name: d }));
    }
    await user.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText(/Good day/i, undefined, { timeout: 10000 })).toBeInTheDocument();
  }, 20000);

  it("logout wipes session + local data and lands back on login", async () => {
    stubApi();
    const user = userEvent.setup();
    await setMeta("auth", sessionMeta());
    await setMeta("locked", false);
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <App />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /Log out of this device/i }));
    expect(await screen.findByRole("button", { name: "Unlock" })).toBeInTheDocument();
    expect(await getMeta("auth")).toBeUndefined();
    expect(await db.patients.toArray()).toHaveLength(0);
  }, 20000);
});
