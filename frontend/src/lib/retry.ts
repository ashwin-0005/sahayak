import { ApiErrorClass } from "./api";

export interface RetryOptions {
  attempts?: number;
  delaysMs?: number[];
  shouldRetry?: (e: unknown) => boolean;
}

// Retry transient failures with backoff; give up (rethrow) on the last
// attempt or when shouldRetry says no. By default only TIMEOUTs and
// network-level errors retry — HTTP errors (wrong PIN, rate limit, …)
// fail fast so we never hammer the server.
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const delays = opts.delaysMs ?? [2000, 5000];
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let last: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i >= attempts - 1 || !shouldRetry(e)) throw e;
      await new Promise((resolve) => setTimeout(resolve, delays[Math.min(i, delays.length - 1)]));
    }
  }
  throw last;
}

function defaultShouldRetry(e: unknown): boolean {
  if (e instanceof ApiErrorClass) return e.code === "TIMEOUT";
  return true;
}
