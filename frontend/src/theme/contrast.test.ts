import { describe, expect, it } from "vitest";
import { colorToken } from "./tokens";

// WCAG 2.x contrast proof for every text/background pairing the UI renders.
// If a pairing below drops under 4.5:1, Lighthouse's color-contrast audit
// fails the whole Accessibility category on every page that renders it —
// which is exactly what happened with ink-on-clinic (~2.5:1) on the
// RiskBadge, RiskBanner, and visit tags. Opacity tints (bg-danger/10 and
// friends) are composited over both backdrops they can sit on (white cards
// and the paper canvas) and the worse of the two must still pass.

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratioOf(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Alpha-composite fg over bg (how Tailwind opacity modifiers render).
function over(fgHex: string, alpha: number, bgHex: string): RGB {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  return [fr * alpha + br * (1 - alpha), fg * alpha + bg * (1 - alpha), fb * alpha + bb * (1 - alpha)];
}

// Worst case of the solid pair and the tint composited over white + paper.
function solidPair(fgHex: string, bgHex: string): number {
  return ratioOf(hexToRgb(fgHex), hexToRgb(bgHex));
}

function tintedPair(fgHex: string, tintHex: string, alpha: number): number {
  return Math.min(
    ratioOf(hexToRgb(fgHex), over(tintHex, alpha, colorToken.white)),
    ratioOf(hexToRgb(fgHex), over(tintHex, alpha, colorToken.paper))
  );
}

const AA = 4.5;

// [label, worst-case ratio] for every rendered text/background pairing.
const PAIRS: [string, number][] = [
  // Solid risk fills (badges, banners, hero, visit tags) — always white text.
  ["white on urgent", solidPair(colorToken.white, colorToken.urgent)],
  ["white on clinic", solidPair(colorToken.white, colorToken.clinic)],
  ["white on home", solidPair(colorToken.white, colorToken.home)],
  // Buttons, toggles, chips.
  ["white on neem/primary", solidPair(colorToken.white, colorToken.neem)],
  ["white on primary-dark", solidPair(colorToken.white, colorToken["primary-dark"])],
  ["white on success", solidPair(colorToken.white, colorToken.success)],
  ["white on danger", solidPair(colorToken.white, colorToken.danger)],
  ["white on info", solidPair(colorToken.white, colorToken.info)],
  ["ink on surface-muted/mist", solidPair(colorToken.text, colorToken["surface-muted"])],
  ["ghost: primary-dark on paper", solidPair(colorToken["primary-dark"], colorToken.paper)],
  // Body text.
  ["ink on paper", solidPair(colorToken.text, colorToken.paper)],
  ["ink on white", solidPair(colorToken.text, colorToken.white)],
  ["neem-dark on paper", solidPair(colorToken["neem-dark"], colorToken.paper)],
  ["neem-dark on white", solidPair(colorToken["neem-dark"], colorToken.white)],
  ["neem-dark on mist", solidPair(colorToken["neem-dark"], colorToken.mist)],
  ["neem on white (active filter/nav)", solidPair(colorToken.neem, colorToken.white)],
  ["neem on paper (active nav)", solidPair(colorToken.neem, colorToken.paper)],
  ["danger on white (errors)", solidPair(colorToken.danger, colorToken.white)],
  ["danger on paper (alerts)", solidPair(colorToken.danger, colorToken.paper)],
  ["danger on mist (discard action)", solidPair(colorToken.danger, colorToken.mist)],
  // Tinted alert/badge surfaces (text on the tint, worst of white/paper base).
  ["ink on warning/15", tintedPair(colorToken.text, colorToken.warning, 0.15)],
  ["danger on danger/10 (quiet button, alerts)", tintedPair(colorToken.danger, colorToken.danger, 0.1)],
  ["danger on danger/15 (badge)", tintedPair(colorToken.danger, colorToken.danger, 0.15)],
  ["neem-dark on success/15 (badge)", tintedPair(colorToken["neem-dark"], colorToken.success, 0.15)],
  ["neem-dark on success/10 (alert)", tintedPair(colorToken["neem-dark"], colorToken.success, 0.1)],
  ["neem-dark on info/10 (alert)", tintedPair(colorToken["neem-dark"], colorToken.info, 0.1)],
  ["neem-dark on warning/15 (alert)", tintedPair(colorToken["neem-dark"], colorToken.warning, 0.15)],
  ["neem-dark on danger/10 (alert)", tintedPair(colorToken["neem-dark"], colorToken.danger, 0.1)]
];

describe("token contrast (WCAG AA)", () => {
  it.each(PAIRS)("%s is >= 4.5:1", (_label, ratio) => {
    expect(ratio).toBeGreaterThanOrEqual(AA);
  });

  it("documents why ink text on clinic is banned (white is required)", () => {
    // The old RiskBadge/RiskBanner/visit-tag pairing. Kept here so nobody
    // "restores" it: ink-on-clinic is ~2.5:1, white-on-clinic is ~6.6:1.
    expect(solidPair(colorToken.text, colorToken.clinic)).toBeLessThan(AA);
    expect(solidPair(colorToken.white, colorToken.clinic)).toBeGreaterThanOrEqual(AA);
  });
});
