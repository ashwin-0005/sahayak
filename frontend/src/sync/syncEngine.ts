import { postSync } from "../lib/api";
import {
  addToQuarantine,
  applyPatientFromServer,
  applyVisitFromServer,
  deleteOutboxRows,
  getMeta,
  getPendingOutbox,
  LAST_PULLED_AT_KEY,
  LAST_SYNC_AT_KEY,
  setMeta
} from "../db/repo";
import type { Patient, RecordResult, SyncStatus, Visit } from "../types";

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
  lastSyncedAt = (await getMeta(LAST_SYNC_AT_KEY)) as string | null;
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
    const lastPulledAt = (await getMeta(LAST_PULLED_AT_KEY)) as string | null;
    const pendingRows = await getPendingOutbox();
    const patients: unknown[] = [];
    const visits: unknown[] = [];
    // Outbox row id -> record id, so we can ack precisely per row.
    const rowIds = new Map<string, number[]>();
    const track = (table: string, recordId: unknown, rowId: number | undefined): void => {
      if (typeof recordId !== "string" || rowId === undefined) return;
      const list = rowIds.get(`${table}:${recordId}`) ?? [];
      list.push(rowId);
      rowIds.set(`${table}:${recordId}`, list);
    };
    for (const row of pendingRows) {
      let parsed: { id?: unknown } | null = null;
      try {
        parsed = JSON.parse(row.record) as { id?: unknown };
      } catch {
        // Corrupt locally — quarantine it for review instead of silently
        // dropping it (it would previously vanish in clearOutbox()).
        await addToQuarantine({
          table: row.table,
          record: { _raw: row.record },
          code: "CORRUPT_RECORD",
          message: "This record was damaged on the device and could not be read.",
          created_at: new Date().toISOString()
        });
        if (row.id !== undefined) await deleteOutboxRows([row.id]);
        continue;
      }
      if (row.table === "patients") {
        patients.push(parsed);
        track("patients", parsed?.id, row.id);
      } else if (row.table === "visits") {
        visits.push(parsed);
        track("visits", parsed?.id, row.id);
      }
    }

    const res = await postSync(token, { lastPulledAt, patients, visits });

    await applyServerPayload(res.patients, res.visits);
    await applySyncResults(res.results ?? [], rowIds);
    await setMeta(LAST_PULLED_AT_KEY, res.serverTime);
    await setMeta(LAST_SYNC_AT_KEY, new Date().toISOString());

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

// Per-record acknowledgement: delete acked rows, quarantine rejected ones
// (with the server's reason) so a single bad record can never block or
// silently lose the rest of the queue.
async function applySyncResults(results: RecordResult[], rowIds: Map<string, number[]>): Promise<void> {
  const pending = await getPendingOutbox();
  const byRowId = new Map(pending.map((p) => [p.id, p]));
  const acked: number[] = [];
  for (const r of results) {
    const ids = rowIds.get(`${r.table}:${r.id}`) ?? [];
    if (r.status === "accepted") {
      acked.push(...ids);
    } else {
      for (const rowId of ids) {
        const row = byRowId.get(rowId);
        let record: unknown = { id: r.id };
        if (row) {
          try {
            record = JSON.parse(row.record) as unknown;
          } catch {
            record = { _raw: row.record };
          }
          await deleteOutboxRows([rowId]);
        }
        await addToQuarantine({
          table: r.table,
          record,
          code: r.code ?? "REJECTED",
          message: r.message ?? "The server did not accept this record.",
          created_at: new Date().toISOString()
        });
      }
    }
  }
  await deleteOutboxRows(acked);
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