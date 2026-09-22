/**
 * Sahayak design tokens — single source of truth for colour, type, radius
 * and elevation. tailwind.config.ts builds its theme from these values, and
 * components that need a runtime colour import them from here, so the CSS
 * layer and inline styles can never drift apart.
 *
 * Accessibility rules (see DESIGN.md for the full table):
 *  - Every foreground/background pairing used for text is WCAG AA (>=4.5:1).
 *  - Status is always conveyed by icon + label + text, never colour alone.
 */

/** Raw palette. Keys are kebab-case so they can be scattered into the Tailwind theme directly. */
export const colorToken = {
  // Legacy names (used across the app since before the design system)
  paper: "#F6F8F4",
  ink: "#10231C",
  neem: "#1D6A50",
  "neem-dark": "#0F4433",
  mist: "#DDE9E2",
  urgent: "#C62828",
  clinic: "#B45309",
  home: "#2E7D32",
  white: "#FFFFFF",
  // Semantic roles
  primary: "#1D6A50",
  "primary-dark": "#0F4433",
  text: "#10231C",
  surface: "#F6F8F4",
  "surface-muted": "#DDE9E2",
  border: "#DDE9E2",
  focus: "#1D6A50",
  info: "#1D6A50",
  success: "#2E7D32",
  warning: "#B45309",
  danger: "#C62828",
  // Sync states (each shown with an icon + word)
  "sync-online": "#1D6A50",
  "sync-syncing": "#1D6A50",
  "sync-offline": "#0F4433",
  "sync-error": "#C62828",
  "sync-pending": "#B45309"
} as const;

export interface TypeStep {
  fontSize: string;
  lineHeight: number | string;
}

/** Mobile-first type scale. Body 17px stays the reading size even offline in the sun. */
export const typeScale = {
  big: { fontSize: "44px", lineHeight: 1.1 },
  page: { fontSize: "30px", lineHeight: 1.2 },
  section: { fontSize: "22px", lineHeight: 1.3 },
  body: { fontSize: "17px", lineHeight: 1.5 },
  label: { fontSize: "15px", lineHeight: 1.4 },
  caption: { fontSize: "13.5px", lineHeight: 1.4 }
} satisfies Record<string, TypeStep>;

/** Tailwind `fontSize` theme map: name -> [size, { lineHeight }]. */
export const fontSizeToken: Record<string, [string, { lineHeight: number | string }]> = Object.fromEntries(
  Object.entries(typeScale).map(([name, step]) => [name, [step.fontSize, { lineHeight: step.lineHeight }]])
);

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