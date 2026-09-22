import { useEffect, useState } from "react";

// True once `active` has stayed true longer than `delayMs`.
// Used to explain slow cold-start responses ("waking up the server")
// instead of leaving the worker staring at a bare spinner.
export function useSlowNotice(active: boolean, delayMs = 3000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);

  return slow;
}
