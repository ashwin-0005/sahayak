import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";
import { colorToken, fontSizeToken, radius, shadow } from "./tokens";
import { RISK_META } from "../lib/riskMeta";

const theme = config.theme.extend;

// WCAG relative luminance + contrast ratio for a hex string.
function luminance(hex: string): number {
  const c = (i: number): number => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

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

  it("risk and system solids clear WCAG AA (4.5:1) on white for outdoor glare", () => {
    const solidText = [
      "urgent",
      "clinic",
      "home",
      "danger",
      "warning",
      "success",
      "primary",
      "primary-dark",
      "offline"
    ] as Array<keyof typeof colorToken>;
    for (const name of solidText) {
      expect(contrast(colorToken[name], colorToken.white), `${name} on white`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("risk colors are decoupled from system semantics (never the same hex)", () => {
    expect(colorToken.urgent).not.toBe(colorToken.danger);
    expect(colorToken.clinic).not.toBe(colorToken.warning);
    expect(colorToken.home).not.toBe(colorToken.success);
  });
});