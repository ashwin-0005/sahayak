import { getMeta, setMeta, wipeAllLocalData } from "../db/repo";
import { postLogin, ApiErrorClass } from "../lib/api";
import type { Worker } from "../types";

export interface Session {
  workerId: string;
  worker: Worker;
  token: string | null; // null after offline unlock if we cleared it — see below
  salt: string;
  pinHash: string;
  // KDF agility: sessions created before PBKDF2 carry "sha256-legacy" and are
  // upgraded transparently on the next successful PIN entry.
  kdf: "pbkdf2-sha256-100k" | "sha256-legacy";
  failedAttempts: number;
  lockedUntil: string | null; // ISO timestamp; offline unlock refused while in the future
}

const AUTH_KEY = "auth";
const LOCKED_KEY = "locked";

// A stolen device exposes IndexedDB, so the offline PIN check must be slow:
// 100k PBKDF2-SHA256 turns a 4-digit PIN from milliseconds to crack into a
// meaningfully expensive search, and the attempt cap (below) stops the loop.
const PBKDF2_ITERATIONS = 100_000;
const MAX_OFFLINE_ATTEMPTS = 5;
const OFFLINE_LOCKOUT_MS = 15 * 60 * 1000;

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return toHex(buf);
}

async function pbkdf2Pin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

async function verifyPin(pin: string, session: Session): Promise<boolean> {
  if (session.kdf === "pbkdf2-sha256-100k") {
    return (await pbkdf2Pin(pin, session.salt)) === session.pinHash;
  }
  return (await sha256(session.salt + ":" + pin)) === session.pinHash;
}

export async function getSession(): Promise<Session | null> {
  const raw = (await getMeta(AUTH_KEY)) as (Partial<Session> & { workerId?: string }) | null;
  if (!raw || !raw.workerId) return null;
  // Migrate pre-KDF sessions: missing fields default to legacy + unlocked.
  return {
    worker: raw.worker as Worker,
    token: raw.token ?? null,
    salt: raw.salt ?? "",
    pinHash: raw.pinHash ?? "",
    kdf: raw.kdf ?? "sha256-legacy",
    failedAttempts: raw.failedAttempts ?? 0,
    lockedUntil: raw.lockedUntil ?? null,
    workerId: raw.workerId
  };
}

async function saveSession(session: Session): Promise<void> {
  await setMeta(AUTH_KEY, session);
}

export function isLockedOut(session: Session): boolean {
  return session.lockedUntil !== null && Date.parse(session.lockedUntil) > Date.now();
}

export async function isLocked(): Promise<boolean> {
  return (await getMeta(LOCKED_KEY)) === true;
}

// Parse a JWT payload without verifying (verification happens server-side).
// Malformed or missing exp counts as expired — the safe direction.
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: unknown };
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// Online login: verify pin against the backend, cache a slow salted PIN hash
// so the worker can unlock offline later.
export async function loginOnline(workerId: string, pin: string): Promise<Session> {
  const { token, worker } = await postLogin(workerId, pin);
  const salt = workerId + ":" + crypto.randomUUID();
  const pinHash = await pbkdf2Pin(pin, salt);
  const session: Session = {
    workerId,
    worker,
    token,
    salt,
    pinHash,
    kdf: "pbkdf2-sha256-100k",
    failedAttempts: 0,
    lockedUntil: null
  };
  await saveSession(session);
  await setMeta(LOCKED_KEY, false);
  return session;
}

// Offline unlock: compare the entered PIN against the cached slow hash.
// Wrong attempts accumulate per device; after MAX_OFFLINE_ATTEMPTS the device
// refuses unlock for OFFLINE_LOCKOUT_MS even with the right PIN.
export async function unlockOffline(workerId: string, pin: string): Promise<Session> {
  const session = await getSession();
  if (!session || session.workerId !== workerId) {
    throw new ApiErrorClass("NO_SESSION", "No saved account on this device");
  }
  if (isLockedOut(session)) {
    throw new ApiErrorClass("LOCKED_OUT", "Too many wrong attempts, try later");
  }
  const ok = await verifyPin(pin, session);
  if (!ok) {
    const failedAttempts = session.failedAttempts + 1;
    const lockedUntil = failedAttempts >= MAX_OFFLINE_ATTEMPTS
      ? new Date(Date.now() + OFFLINE_LOCKOUT_MS).toISOString()
      : session.lockedUntil;
    await saveSession({ ...session, failedAttempts, lockedUntil });
    throw new ApiErrorClass("INVALID_PIN", "Incorrect PIN");
  }
  // Success: reset the counter and upgrade legacy hashes (we have the PIN).
  const upgraded: Session = {
    ...session,
    failedAttempts: 0,
    lockedUntil: null,
    kdf: "pbkdf2-sha256-100k",
    pinHash: session.kdf === "pbkdf2-sha256-100k" ? session.pinHash : await pbkdf2Pin(pin, session.salt)
  };
  await saveSession(upgraded);
  await setMeta(LOCKED_KEY, false);
  return upgraded;
}

export async function lockApp(): Promise<void> {
  await setMeta(LOCKED_KEY, true);
}

// Log out of this device: wipe everything — patients, visits, outbox,
// quarantine, session token, and PIN hash. Nothing may survive handover.
export async function deleteSession(): Promise<void> {
  await wipeAllLocalData();
}
