import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSlowNotice } from "./useSlow";

afterEach(() => {
  vi.useRealTimers();
});

describe("useSlowNotice", () => {
  it("stays false before the delay, flips true after, resets when inactive", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }: { active: boolean }) => useSlowNotice(active), {
      initialProps: { active: true }
    });

    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });
});
