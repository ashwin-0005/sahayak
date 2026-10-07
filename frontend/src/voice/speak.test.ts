import { afterEach, describe, expect, it, vi } from "vitest";
import { hasVoiceFor, speak } from "./speak";

// speak() is best-effort by design: it must never throw into its caller,
// because the Risk Result screen auto-speaks on mount and a throw there
// would blank that screen (React unmounts the tree on an effect error).

const G = globalThis as unknown as Record<string, unknown>;

interface StubSS {
  getVoices: () => { lang: string }[];
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  onvoiceschanged: null;
}

function workingStubs(): { calls: { text: string; lang: string }[]; ss: StubSS } {
  const calls: { text: string; lang: string }[] = [];
  G.SpeechSynthesisUtterance = class {
    text: string;
    lang = "";
    voice: unknown = null;
    rate = 1;
    constructor(text: string) {
      this.text = text;
    }
  };
  const ss: StubSS = {
    getVoices: () => [{ lang: "en-IN" }],
    cancel: vi.fn(),
    speak: vi.fn((u: { text: string; lang: string }) => {
      calls.push({ text: u.text, lang: u.lang });
    }),
    onvoiceschanged: null
  };
  G.speechSynthesis = ss;
  return { calls, ss };
}

afterEach(() => {
  delete G.speechSynthesis;
  delete G.SpeechSynthesisUtterance;
});

describe("speak", () => {
  it("returns false when speechSynthesis is unavailable", () => {
    expect(speak("hello", "en")).toBe(false);
  });

  it("speaks with the matched voice when available", () => {
    const { calls, ss } = workingStubs();
    expect(speak("hello", "en")).toBe(true);
    expect(ss.speak).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ text: "hello", lang: "en-IN" });
    expect(hasVoiceFor("en")).toBe(true);
    expect(hasVoiceFor("hi")).toBe(false);
  });

  it("never throws when the voice assignment fails (returns false)", () => {
    const { ss } = workingStubs();
    G.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      constructor(text: string) {
        this.text = text;
      }
      // Mirrors Chromium: assigning a non-genuine voice throws a TypeError.
      set voice(_v: unknown) {
        throw new TypeError("Failed to convert value to 'SpeechSynthesisVoice'");
      }
    };
    expect(() => speak("hello", "en")).not.toThrow();
    expect(speak("hello", "en")).toBe(false);
    // The broken utterance never reached the device.
    expect(ss.speak).not.toHaveBeenCalled();
  });
});
