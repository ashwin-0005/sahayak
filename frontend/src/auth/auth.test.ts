import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db.js";
import { setMeta } from "../db/repo";
import { ApiErrorClass } from "../lib/api";
import {
  getSession,
  isTokenExpired,
  loginOnline,
  sha256,
  unlockOffline,
  type Session
} from "./auth";

function jwtWithExp(exp: number): string {
  const b64 = (o: unknown): string => {
    const s = btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return s;
  };
  return `${b64({ alg: "HS256" })}.${b64({ workerId: "w1", exp })}.sig`;
}

beforeEach(async () => {
  await db.transaction("rw", db.patients, db.visits, db.outbox, db.quarantine, db.meta, async () => {
    await db.patients.clear();
    await db.visits.clear();
    await db.outbox.clear();
    await db.quarantine.clear();
    await db.meta.clear();
  });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: jwtWithExp(Math.floor(Date.now() / 1000) + 3600), worker: { id: "w1", name: "Asha", village: "V" } })
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth: PBKDF2 offline PIN + attempt cap", () => {
  it("loginOnline caches a slow PBKDF2 hash, not plain SHA-256", async () => {
    const s = await loginOnline("w1", "1234");
    expect(s.kdf).toBe("pbkdf2-sha256-100k");
    expect(s.failedAttempts).toBe(0);
    expect(s.lockedUntil).toBeNull();
    // A fast single-round SHA-256 of the same input must NOT match.
    expect(s.pinHash).not.toBe(await sha256(s.salt + ":1234"));
    // ...but offline unlock with the PIN succeeds.
    const unlocked = await unlockOffline("w1", "1234");
    expect(unlocked.workerId).toBe("w1");
  });

  it("locks the device after 5 wrong offline PINs", async () => {
    await loginOnline("w1", "1234");
    for (let i = 0; i < 5; i++) {
      await expect(unlockOffline("w1", "0000")).rejects.toMatchObject({ code: "INVALID_PIN" });
    }
    const stored = (await getSession()) as Session;
    expect(stored.failedAttempts).toBe(5);
    expect(stored.lockedUntil).not.toBeNull();
    // Even the right PIN is refused while locked.
    await expect(unlockOffline("w1", "1234")).rejects.toMatchObject({ code: "LOCKED_OUT" });
    // And a different worker id never matches a cached session.
    await expect(unlockOffline("w2", "1234")).rejects.toMatchObject({ code: "NO_SESSION" });
  });

  it("a successful unlock resets the attempt counter", async () => {
    await loginOnline("w1", "1234");
    await expect(unlockOffline("w1", "0000")).rejects.toMatchObject({ code: "INVALID_PIN" });
    await unlockOffline("w1", "1234");
    const stored = (await getSession()) as Session;
    expect(stored.failedAttempts).toBe(0);
    expect(stored.lockedUntil).toBeNull();
  });

  it("legacy SHA-256 sessions unlock once and upgrade to PBKDF2", async () => {
    const salt = "w1:legacy-salt";
    const legacy: Session = {
      workerId: "w1",
      worker: { id: "w1", name: "Asha", village: "V" },
      token: null,
      salt,
      pinHash: await sha256(salt + ":1234"),
      kdf: "sha256-legacy",
      failedAttempts: 0,
      lockedUntil: null
    };
    await setMeta("auth", legacy);
    const unlocked = await unlockOffline("w1", "1234");
    expect(unlocked.kdf).toBe("pbkdf2-sha256-100k");
    expect(unlocked.pinHash).not.toBe(legacy.pinHash);
    // Second unlock uses the upgraded hash.
    await unlockOffline("w1", "1234");
  });

  it("an expired lockout admits the right PIN again", async () => {
    await loginOnline("w1", "1234");
    const stored = (await getSession()) as Session;
    await setMeta("auth", { ...stored, failedAttempts: 5, lockedUntil: new Date(Date.now() - 1000).toISOString() });
    const unlocked = await unlockOffline("w1", "1234");
    expect(unlocked.failedAttempts).toBe(0);
  });
});

describe("auth: isTokenExpired", () => {
  it("treats null, malformed, and expired tokens as expired", () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired("garbage")).toBe(true);
    expect(isTokenExpired(jwtWithExp(Math.floor(Date.now() / 1000) - 10))).toBe(true);
  });

  it("accepts a live token", () => {
    expect(isTokenExpired(jwtWithExp(Math.floor(Date.now() / 1000) + 3600))).toBe(false);
  });

  it("ApiErrorClass carries codes the UI switches on", () => {
    expect(new ApiErrorClass("LOCKED_OUT", "x").code).toBe("LOCKED_OUT");
  });
});
