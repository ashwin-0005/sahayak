import { describe, expect, it } from "vitest";
import en from "./en.json";
import hi from "./hi.json";

type JsonNode = string | number | boolean | null | { [k: string]: JsonNode };

// Both languages must expose the EXACT same key tree, or t() lookups will
// silently fall back (or worse, render raw keys) in one of them.
function flattenKeys(node: JsonNode, prefix = ""): string[] {
  if (node === null || typeof node !== "object") return [prefix.slice(0, -1)];
  return Object.entries(node).flatMap(([k, v]) => flattenKeys(v, `${prefix}${k}.`));
}

describe("i18n key parity", () => {
  it("en.json and hi.json expose the same keys", () => {
    const enKeys = flattenKeys(en as JsonNode).sort();
    const hiKeys = flattenKeys(hi as JsonNode).sort();
    expect(enKeys).toEqual(hiKeys);
  });

  it("interpolation placeholders agree across languages", () => {
    const vars = (s: string): string => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((m) => m.trim()).sort().join("|");
    // spot-check a few placeholder-sensitive templates
    const sampleKeys = ["home.greeting", "home.overdueBy", "status.pending", "status.lastSync", "detail.nextVisit", "risk.nextVisitDays", "reminder.greet", "reminder.nextVisitLine"];
    for (const key of sampleKeys) {
      const enVal = key.split(".").reduce<JsonNode>((n, k) => (n as { [x: string]: JsonNode })[k], en as JsonNode);
      const hiVal = key.split(".").reduce<JsonNode>((n, k) => (n as { [x: string]: JsonNode })[k], hi as JsonNode);
      const enV = vars(String(enVal));
      const hiV = vars(String(hiVal));
      expect(enV, `${key}: en has ${enV}`).toBe(hiV);
    }
  });
});