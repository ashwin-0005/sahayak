import { useCallback, useEffect, useState } from "react";
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