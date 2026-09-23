# Sahayak Design System

A lightweight, consistent visual language for the Sahayak field app. No UI
framework — everything is built on the existing Tailwind classes plus a few
shared React components, so it stays small, offline-friendly and readable
even in direct sunlight.

- Single source of truth: [`src/theme/tokens.ts`](src/theme/tokens.ts).
- Tailwind derives its theme from the same file (`tailwind.config.ts`),
  and `src/theme/tokens.test.ts` guards against drift.
- Status is **never conveyed by colour alone** — always icon + label + text.

## Principles

1. **Mobile-first and thumb-sized.** Primary targets are at least 48–56px
   tall; one-handed use is the default.
2. **Readable in the field.** Body text is 17px, high contrast, inflated
   font stack (Mukta supports Latin + Devanagari).
3. **Calm and trustworthy.** A deep clinical green as the lead, quiet
   neutrals, sparse elevation.
4. **Risk colour is reserved for risk.** `urgent` / `clinic` / `home` appear
   **only** on clinical risk elements. Everything else (alerts, forms, sync,
   destructive buttons, selection state) uses the decoupled system tokens —
   deliberately different hexes, so a toast never reads as a risk verdict.
5. **Never colour-only.** Every badge, alert, chip and risk indicator pairs
   its colour with an icon and a label (and rationale where relevant).
6. **Accessible by default.** All text pairings meet WCAG AA (>=4.5:1), and
   risk/system solids were darkened for bright outdoor glare (>5:1); a
   visible 3px focus ring ships in `index.css`.

## Colour tokens

Defined in `colorToken` in `src/theme/tokens.ts`. Three groups:

### Neem ramp (brand green)

| Token | Hex | Use |
| --- | --- | --- |
| `neem-50` | `#EEF6F2` | Faintest brand tint |
| `neem-100` (`mist` alias) | `#DDE9E2` | Chip/tab tracks, muted fills, borders |
| `neem-200` | `#C6DDD1` | Hover fills |
| `neem-300` | `#A4C9B7` | Large surface tints |
| `neem-500` (`neem`/`primary`) | `#1D6A50` | Primary actions, active states |
| `neem-600` | `#175A44` | Info, focus ring |
| `neem-700` (`neem-dark`) | `#0F4433` | Strong headings, secondary text |
| `neem-900` | `#08251C` | Text on tinted fills |

### Risk ramp — RESERVED for clinical risk only

| Token | Hex | On-white contrast |
| --- | --- | --- |
| `urgent` | `#B3261E` | 6.5:1 |
| `clinic` | `#8A4F03` | 6.6:1 |
| `home` | `#1B5E20` | 7.9:1 |

### System semantics — decoupled from the risk hexes

| Token | Hex | Use |
| --- | --- | --- |
| `success` | `#15803D` | Positive confirmation, adherence "Yes" |
| `warning` | `#B45309` | Pending sync, caution notices |
| `danger` | `#B91C1C` | Form errors, destructive actions |
| `info` | `#175A44` | Informational notices |
| `offline` | `#5B6472` | Offline state |

### Base canvas

`ink`/`text` `#10231C` (default text), `paper`/`surface`/`bg` `#F6F8F4`,
`border` `#DDE9E2`. Sync states map to system tokens
(`sync-online`/`sync-syncing` = info, `sync-offline` = offline,
`sync-error` = danger, `sync-pending` = warning).

Legacy names (`neem`, `neem-dark`, `mist`, `urgent`, `clinic`, `home`) are
kept so older code resolves unchanged; **do not** start new uses of risk
colours outside risk contexts.

### Contrast (WCAG AA requires >=4.5:1)

| Pairing | Ratio | Meets AA |
| --- | --- | --- |
| `white` / `urgent` | 6.5:1 | normal text |
| `white` / `clinic` | 6.6:1 | normal text |
| `white` / `home` | 7.9:1 | normal text |
| `white` / `danger` | 6.5:1 | normal text |
| `white` / `warning` | 5.0:1 | normal text |
| `white` / `success` | 5.0:1 | normal text |
| `white` / `primary` (`neem-500`) | 6.5:1 | normal text |
| `white` / `primary-dark` (`neem-700`) | 11.1:1 | normal text |
| `ink` / `paper` | 15.4:1 | normal text |
| `primary-dark` / `paper` | 10.3:1 | normal text |
| `primary` / `paper` | 6.1:1 | normal text |
| `danger` / `paper` | 6.0:1 | normal text |
| `warning` / `paper` | 4.7:1 | normal text |
| `success` / `paper` | 4.7:1 | normal text |

Tinted fills (`bg-danger/10`, `bg-info/10`, ...) sit between the solid tone
and white, so text in them uses the ink / neem-dark scale for comfortable
contrast. If a new pairing is ever added, compute its ratio against these
before shipping.

## Type scale

Exactly **five** sizes — `typeScale` in `src/theme/tokens.ts`, font **Mukta**
(Latin + Devanagari). Weight is applied at use sites (`font-extrabold` etc.),
never baked into the tokens.

| Utility | Size / line-height | Use for |
| --- | --- | --- |
| `text-display` | 40px / 1.1 | **Key numbers only**: overdue counts, BP readings, verdicts. NOT headers or nav chrome |
| `text-page` | 28px / 1.2 | Page titles |
| `text-section` | 20px / 1.3 | Section / group headings — never numerals |
| `text-body` | 17px / 1.5 | **Default reading text** |
| `text-support` | 14px / 1.5 | Field labels, hints, meta, captions |

Deprecated aliases resolve to the nearest step so old code compiles:
`text-big` → display, `text-label` and `text-caption` → support.

## Spacing, radius, elevation

- **Spacing rhythm** — named tokens in `tailwind.config.ts` (`spacing`):
  `card` 12px between sibling cards / pile rows (`gap-card`), `control` 16px
  between a label and its control (`mt-control`), `section` 24px between
  blocks of different content (`mt-section`), plus `4.5` = 18px. Raw Tailwind
  values still resolve; shared components use the named tokens first.
- **Radius** (`radius`): `card` 10px for surfaces, `button` 14px for
  interactions, `pill` 999px for chips and badges.
- **Elevation** (`shadow`): `card` resting surfaces, `raised` active/focused
  controls, `sheet` overlays (slides up from the bottom).

## Focus

Global in `index.css`: a 3px `focus` outline at 2px offset follows each
control's own border radius. Never remove or restyle focus for keyboard
users; `focus-visible` keeps mouse/touch clicks clean.

## Components

Shared primitives in `src/components/`:

| Component | Purpose |
| --- | --- |
| `BigButton` | Thumb-sized button: `primary` / `secondary` / `ghost` / `danger` (system red, never risk red) |
| `Field` | Label + control + hint/error block |
| Input styles (`.input`, `.textarea`) | One shared border/radius/height for every form control |
| `ToggleGroup` | aria-pressed segmented / pill option groups (single or multi); active option always shows a check glyph, tones use system colours |
| `NumberPad` | Digit-only keypad (no decimal), `maxLength` caller-supplied — PINs 4–6 digits, readings up to 3 |
| `Badge` | Small pill: icon + label, `neutral/info/success/warning/danger` (system tones) |
| `RiskBadge` | Risk pill (`urgent/clinic/home`) — icon + word, tinted (risk palette — the only place those hexes appear) |
| `RiskBanner` | Fixed risk header: colour + icon + title + reason lines |
| `Alert` | Non-blocking banner: `info/success/warning/danger/offline` (system tones), optional action |
| `StatusChip` | Sync state pill (online/syncing/offline/error) — icon + word |
| `SyncStatus` | Dashboard status card wrapping `StatusChip` + last-synced + Sync now |
| `Sheet` | Bottom-sheet modal (focus trap + Escape + return focus via `useDialog`) |
| `ConditionBadge` | Patient condition pill |
| `EmptyState`, `Skeleton`, `FilterTabs`, `FollowUpGroup`, `PatientCard`, `Toast`, `BottomNav`, `PageShell` | Screen-level patterns |

Pill shapes are a single spec — `.pill` in `index.css` (`.tag`, `.badge`,
`.chip` are deprecated aliases of the same class).

## Rules for contributors

- Change a colour/radius/size/text-step in `src/theme/tokens.ts` — never as
  an inline hex somewhere downstream.
- Risk colours (`urgent`/`clinic`/`home`) appear **only** on clinical risk
  elements; use system tokens for everything else.
- Keep every status visual icon + label + text; a colour change alone is
  never an acceptable signal.
- Reuse the shared components instead of re-styling raw elements; if a
  pattern repeats a third time, extract it.
- Verify with `npm run typecheck`, `npm test`, and a production build.