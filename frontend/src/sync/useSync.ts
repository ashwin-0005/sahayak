import { useCallback, useEffect, useRef, useState } from "react";
import { getSyncSnapshot, subscribeSync, syncNow, type SyncState } from "./syncEngine";

export function useSync(): SyncState & { syncNow: () => Promise<void> } {
  const [state, setState] = useState<SyncState>(getSyncSnapshot());

  useEffect(() => subscribeSync(setState), []);

  const run = useCallback(async () => {
    await syncNow();
    setState(getSyncSnapshot());
  }, []);

  return { ...state, syncNow: run };
}

// Reload a page's data once a background sync settles. Guards the cold-start
// race where a list page mounts before the first pull writes to IndexedDB —
// the initial render would otherwise stay stale-empty even though the sync
// (completed in the background) did populate the local store.
export function useReloadOnSync(load: () => void | Promise<void>): void {
  const sync = useSync();
  const loadRef = useRef(load);
  loadRef.current = load;
  const prevStatus = useRef(sync.status);
  useEffect(() => {
    const settled = sync.status === "idle" || sync.status === "error";
    if (settled && prevStatus.current === "syncing") void loadRef.current();
    prevStatus.current = sync.status;
  }, [sync.status]);
}