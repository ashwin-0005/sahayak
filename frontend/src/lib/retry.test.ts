import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiErrorClass } from "./api";
import { withRetry } from "./retry";

afterEach(() => {
  vi.useRealTimers();
});

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures with backoff, then succeeds", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new TypeError("network down");
      return "late";
    });
    const p = withRetry(fn, { attempts: 3, delaysMs: [2000, 5000] });
    const assertion = expect(p).resolves.toBe("late");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("never retries auth errors — a wrong PIN fails fast, once", async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async (): Promise<string> => {
      throw new ApiErrorClass("INVALID_CREDENTIALS", "bad pin");
    });
    const p = withRetry(fn, { attempts: 3 });
    await expect(p).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up after 3 attempts on persistent timeouts", async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async (): Promise<string> => {
      throw new ApiErrorClass("TIMEOUT", "timed out");
    });
    const p = withRetry(fn, { attempts: 3, delaysMs: [2000, 5000] });
    const assertion = expect(p).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
