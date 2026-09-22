import { getMeta, setMeta, wipeAllLocalData } from "../db/repo";
import { postLogin, ApiErrorClass } from "../lib/api";
import type { Worker } from "../types";

export interface Session {
  workerId: string;
  worker: Worker;
  token: string | null; // null after offline unlock if we cleared it — see below
  salt: string;
  pinHash: string;
}

const AUTH_KEY = "auth";
const LOCKED_KEY = "locked";

const encoder = new TextEncoder();

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getSession(): Promise<Session | null> {
  return (await getMeta(AUTH_KEY)) as Session | null;
}

export async function isLocked(): Promise<boolean> {
  return (await getMeta(LOCKED_KEY)) === true;
}

// Online login: verify pin against the backend, cache a salted pin hash so the
// worker can unlock offline later.
export async function loginOnline(workerId: string, pin: string): Promise<Session> {
  const { token, worker } = await postLogin(workerId, pin);
  const salt = workerId + ":" + crypto.randomUUID();
  const pinHash = await sha256(salt + ":" + pin);
  const session: Session = { workerId, worker, token, salt, pinHash };
  await setMeta(AUTH_KEY, session);
  await setMeta(LOCKED_KEY, false);
  return session;
}

// Offline unlock: compare the entered PIN against the cached salted hash.
export async function unlockOffline(workerId: string, pin: string): Promise<Session> {
  const session = await getSession();
  if (!session || session.workerId !== workerId) {
    throw new ApiErrorClass("NO_SESSION", "No saved account on this device");
  }
  const candidate = await sha256(session.salt + ":" + pin);
  if (candidate !== session.pinHash) {
    throw new ApiErrorClass("INVALID_PIN", "Incorrect PIN");
  }
  await setMeta(LOCKED_KEY, false);
  return session;
}

export async function lockApp(): Promise<void> {
  await setMeta(LOCKED_KEY, true);
}

export async function setToken(token: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await setMeta(AUTH_KEY, { ...session, token });
}

// Log out of this device: wipe everything — patients, visits, outbox,
// quarantine, session token, and PIN hash. Nothing may survive handover.
export async function deleteSession(): Promise<void> {
  await wipeAllLocalData();
}