import { postSync } from "../lib/api";
import {
  applyPatientFromServer,
  applyVisitFromServer,
  clearOutbox,
  getMeta,
  getPendingOutbox,
  setMeta
} from "../db/repo";
import type { Patient, SyncStatus, Visit } from "../types";

// JSON-string fields the backend returns (SQLite TEXT columns).
function parseServerPatient(row: Record<string, unknown>): Patient {
  return row as unknown as Patient;
}

function parseServerVisit(row: Record<string, unknown>): Visit {
  const v = { ...row } as Record<string, unknown>;
  v.symptoms = parseJsonField(v.symptoms);
  v.reason_codes = parseJsonField(v.reason_codes);
  return v as unknown as Visit;
}

function parseJsonField(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

type Listener = (state: SyncState) => void;

export interface SyncState {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
  inFlight: boolean;
}

const listeners = new Set<Listener>();
let status: SyncStatus = "idle";
let lastSyncedAt: string | null = null;
let pending = 0;
let inFlight = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 5000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
let syncId = 0;

function emit(): void {
  const state: SyncState = { status, pending, lastSyncedAt, inFlight };
  for (const l of listeners) l(state);
}

export function subscribeSync(cb: Listener): () => void {
  listeners.add(cb);
  cb({ status, pending, lastSyncedAt, inFlight });
  return () => {
    listeners.delete(cb);
  };
}

async function refreshPending(): Promise<void> {
  pending = (await getPendingOutbox()).length;
  lastSyncedAt = (await getMeta("lastSyncAt")) as string | null;
  emit();
}

// The one and only sync routine. Never loses outbox data on failure.
export async function syncNow(): Promise<boolean> {
  if (inFlight) return false;
  syncId += 1;
  const id = syncId;

  if (!navigator.onLine) {
    status = "offline";
    emit();
    return false;
  }
  const session = (await getMeta("auth")) as
    | { token: string | null; workerId: string }
    | null;
  const token = session?.token ?? null;
  if (!token) {
    status = status === "error" ? status : "idle";
    emit();
    return false;
  }

  inFlight = true;
  status = "syncing";
  emit();

  try {
    const lastPulledAt = (await getMeta("lastPulledAt")) as string | null;
    const pendingRows = await getPendingOutbox();
    const patients: unknown[] = [];
    const visits: unknown[] = [];
    for (const row of pendingRows) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(row.record);
      } catch {
        continue;
      }
      if (row.table === "patients") patients.push(parsed);
      else if (row.table === "visits") visits.push(parsed);
    }

    const res = await postSync(token, { lastPulledAt, patients, visits });

    await applyServerPayload(res.patients, res.visits);
    await clearOutbox();
    await setMeta("lastPulledAt", res.serverTime);
    await setMeta("lastSyncAt", new Date().toISOString());

    if (id !== syncId) return false; // a newer call took over
    backoffMs = 5000;
    status = "idle";
    lastSyncedAt = new Date().toISOString();
    await refreshPending();
    return true;
  } catch {
    if (id !== syncId) return false;
    status = "error";
    emit();
    scheduleRetry();
    return false;
  } finally {
    if (id === syncId) {
      inFlight = false;
      emit();
    }
  }
}

// Offline failure retry with exponential backoff, capped at 5 minutes.
function scheduleRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (inFlight) return;
    void syncNow();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

async function applyServerPayload(
  serverPatients: Record<string, unknown>[],
  serverVisits: Record<string, unknown>[]
): Promise<void> {
  for (const row of serverPatients) {
    await applyPatientFromServer(parseServerPatient(row));
  }
  for (const row of serverVisits) {
    await applyVisitFromServer(parseServerVisit(row));
  }
}

export async function initSyncEngine(): Promise<void> {
  await refreshPending();
  // Initial sync shortly after load.
  setTimeout(() => void syncNow(), 800);
  window.addEventListener("online", () => {
    status = "idle";
    void syncNow();
  });
  // Every 60s while online.
  setInterval(() => {
    if (navigator.onLine) void syncNow();
  }, 60_000);
}

export function getSyncSnapshot(): SyncState {
  return { status, pending, lastSyncedAt, inFlight };
}