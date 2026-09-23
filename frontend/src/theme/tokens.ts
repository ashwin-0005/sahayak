/**
 * Sahayak design tokens — single source of truth for colour, type, radius,
 * elevation and spacing. tailwind.config.ts builds its theme from these
 * values, and components that need a runtime colour import them from here,
 * so the CSS layer and inline styles can never drift apart.
 *
 * Accessibility rules (see DESIGN.md for the full table):
 *  - Every foreground/background pairing used for text is WCAG AA (>=4.5:1),
 *    measured at the new high-contrast values because the field is outdoors
 *    in bright light.
 *  - Risk colours (urgent/clinic/home) are RESERVED for clinical risk and
 *    never used as decoration. Non-risk status (alerts, forms, sync) uses
 *    the decoupled system semantics (success/warning/danger/info/offline),
 *    which are deliberately different hexes so a toast never reads as a
 *    clinical risk state.
 *  - Status is always conveyed by icon + label + text, never colour alone.
 */

/** Raw palette. Keys are kebab-case so they can be scattered into the Tailwind theme directly. */
export const colorToken = {
  // Base canvas & ink (unchanged)
  paper: "#F6F8F4",
  ink: "#10231C",

  // Neem ramp — the brand green as an explicit 50..900 scale.
  "neem-50": "#EEF6F2",
  "neem-100": "#DDE9E2",
  "neem-200": "#C6DDD1",
  "neem-300": "#A4C9B7",
  "neem-400": "#5E9E83",
  "neem-500": "#1D6A50",
  "neem-600": "#175A44",
  "neem-700": "#0F4433",
  "neem-800": "#0A3327",
  "neem-900": "#08251C",

  // Legacy aliases (kept so the existing tree resolves unchanged)
  neem: "#1D6A50", // neem-500
  "neem-dark": "#0F4433", // neem-700
  mist: "#DDE9E2", // neem-100

  // Risk ramp — RESERVED for clinical risk only. Darkened for bright-light AA:
  // urgent ~5.5:1, clinic ~5.4:1, home ~6.1:1 on white (previously ~4.5:1).
  urgent: "#B3261E",
  clinic: "#8A4F03",
  home: "#1B5E20",

  // System semantics — decoupled from the risk hexes so forms/alerts/sync
  // can never be mistaken for clinical risk.
  primary: "#1D6A50",
  "primary-dark": "#0F4433",
  text: "#10231C",
  surface: "#F6F8F4",
  "surface-muted": "#DDE9E2",
  border: "#DDE9E2",
  focus: "#175A44",
  info: "#175A44",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
  offline: "#5B6472",

  // Sync states (each shown with an icon + word)
  "sync-online": "#175A44",
  "sync-syncing": "#175A44",
  "sync-offline": "#5B6472",
  "sync-error": "#B91C1C",
  "sync-pending": "#B45309",

  white: "#FFFFFF"
} as const;

export interface TypeStep {
  fontSize: string;
  lineHeight: number | string;
}

/**
 * Mobile-first type scale — exactly five sizes.
 *  - display: key numbers (overdue counts, BP readings, verdicts). NOT for
 *    headers or nav chrome.
 *  - page: screen titles.
 *  - section: block/group headers only — never numerals.
 *  - body: the default reading size (17px holds up in the sun).
 *  - support: labels, hints, meta, captions.
 * Legacy names (big/label/caption) map onto the nearest step so old code
 * resolves until screens migrate. Weight is applied at use sites
 * (font-extrabold etc.), never baked into the size token.
 */
export const typeScale = {
  display: { fontSize: "40px", lineHeight: 1.1 },
  page: { fontSize: "28px", lineHeight: 1.2 },
  section: { fontSize: "20px", lineHeight: 1.3 },
  body: { fontSize: "17px", lineHeight: 1.5 },
  support: { fontSize: "14px", lineHeight: 1.5 }
} satisfies Record<string, TypeStep>;

/**
 * Tailwind `fontSize` theme map: name -> [size, { lineHeight }]. Deprecated
 * aliases resolve to the nearest step; font-weight is applied by the
 * component classes (font-extrabold etc.), not baked into the token.
 */
export const fontSizeToken: Record<string, [string, { lineHeight: number | string }]> = Object.fromEntries(
  Object.entries(typeScale).map(([name, step]) => [name, [step.fontSize, { lineHeight: step.lineHeight }]])
);
// Deprecated names — resolve to the nearest surviving step.
fontSizeToken["big"] = fontSizeToken["display"];
fontSizeToken["label"] = fontSizeToken["support"];
fontSizeToken["caption"] = fontSizeToken["support"];

/** Corner radii for interaction surfaces. */
export const radius = {
  card: "10px",
  button: "14px",
  pill: "999px"
} as const;

/** Elevation: card = resting surfaces, raised = active/in-focus controls, sheet = overlays. */
export const shadow = {
  card: "0 1px 2px rgba(16,35,28,0.06)",
  raised: "0 4px 12px rgba(16,35,28,0.10)",
  sheet: "0 -8px 30px rgba(16,35,28,0.18)"
} as const;

/**
 * Spacing rhythm — the only legal gaps for shared components.
 *  - card: 12px  between sibling cards / pile rows
 *  - control: 16px between a label and its control
 *  - section: 24px between blocks of different content
 * Screens migrate to these names over time; raw values stay legal today.
 */
export const spacing = {
  "4.5": "18px",
  card: "12px",
  control: "16px",
  section: "24px"
} as const;