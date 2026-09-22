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
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(screen.queryByRole("status")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Waking up the server");
  });
});
