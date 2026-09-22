import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { db } from "../db/db.js";
import "../i18n";
import LoginPage from "./Login";

// Simulates a sleeping free-tier server: requests hang instead of failing.
beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.meta.clear();
  });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => undefined))
  );
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Login cold-start experience", () => {
  it("shows the waking message with a spinner when the server is slow", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Worker ID"), { target: { value: "asha001" } });
    for (const d of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    // Busy, but no wake message yet (under the 2s threshold).
    // (The PIN readout is its own status region — scope to the wake text.)
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(screen.queryByText(/Waking up the server/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
  });

  it("maps failures to truthful messages: wrong PIN, locked account, offline setup, dead server", async () => {
    // No timer-dependent behavior here; async queries need real timers.
    vi.useRealTimers();
    const errBody = (code: string) => ({
      ok: false,
      json: async () => ({ error: { code, message: code } })
    });

    async function submitExpecting(text: RegExp): Promise<void> {
      fireEvent.change(screen.getByLabelText("Worker ID"), { target: { value: "asha001" } });
      for (const d of ["1", "2", "3", "4"]) {
        fireEvent.click(screen.getByRole("button", { name: d }));
      }
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(text);
    }

    // Wrong PIN -> credential message (reveals nothing about which half).
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errBody("INVALID_CREDENTIALS")));
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );
    await submitExpecting(/Incorrect worker ID or PIN/);
  });

  it("shows the lockout message for a server-side account lock", async () => {
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { code: "ACCOUNT_LOCKED", message: "x" } }) })
    );
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText("Worker ID"), { target: { value: "asha001" } });
    for (const d of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many wrong attempts/);
  });

  it("shows a connection message when the server is unreachable (never 'wrong PIN')", { timeout: 20000 }, async () => {
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText("Worker ID"), { target: { value: "asha001" } });
    for (const d of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    // Network errors retry with backoff (~7s) before surfacing.
    const alert = await screen.findByRole("alert", undefined, { timeout: 12000 });
    expect(alert).toHaveTextContent(/Can't reach the server/);
    expect(alert).not.toHaveTextContent(/Incorrect/);
  });

  it("tells offline workers with no saved account how to set the device up", async () => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText("Worker ID"), { target: { value: "nobody" } });
    for (const d of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No saved account/);
  });

  it("pre-fills the worker ID passed from the landing demo button", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { workerId: "demo" } }]}>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText("Worker ID")).toHaveValue("demo");
  });
});
