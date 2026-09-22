import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";
import { colorToken, fontSizeToken, radius, shadow } from "./tokens";
import { RISK_META } from "../lib/riskMeta";

const theme = config.theme.extend;

describe("design tokens", () => {
  it("Tailwind theme is built from the same color tokens", () => {
    for (const [name, value] of Object.entries(colorToken) as Array<[keyof typeof colorToken, string]>) {
      expect(theme.colors[name]).toBe(value);
    }
  });

  it("Tailwind theme inherits the token type scale, radius and shadows", () => {
    for (const [name, [size]] of Object.entries(fontSizeToken)) {
      expect(theme.fontSize[name]?.[0]).toBe(size);
    }
    for (const [name, value] of Object.entries(radius) as Array<[keyof typeof radius, string]>) {
      expect(theme.borderRadius[name]).toBe(value);
    }
    for (const [name, value] of Object.entries(shadow) as Array<[keyof typeof shadow, string]>) {
      expect(theme.boxShadow[name]).toBe(value);
    }
  });

  it("risk colors never drift from the shared palette", () => {
    expect(RISK_META.urgent.color).toBe(colorToken.urgent);
    expect(RISK_META.clinic.color).toBe(colorToken.clinic);
    expect(RISK_META.home.color).toBe(colorToken.home);
  });
});