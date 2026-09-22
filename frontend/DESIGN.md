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
   neutrals, sparse elevation. Risk red / clinic amber / home green carry
   real meaning and always travel with words.
4. **Never colour-only.** Every badge, alert, chip and risk indicator pairs
   its colour with an icon and a label (and rationale where relevant).
5. **Accessible by default.** All text pairings meet WCAG AA (>=4.5:1); a
   visible 3px focus ring ships in `index.css`.

## Colour tokens

Defined in `colorToken` (camel/kebab keys) in `src/theme/tokens.ts`. Legacy
names (`neem`, `urgent`, ...) are kept alongside semantic aliases
(`primary`, `danger`, `warning`, `success`, `info`, `focus`), so both old an
new code resolve to the exact same hex values.

| Token | Hex | Role |
| --- | --- | --- |
| `primary` / `neem` | `#1D6A50` | Primary actions, active states |
| `primary-dark` / `neem-dark` | `#0F4433` | Strong headings, secondary text |
| `text` / `ink` | `#10231C` | Default text on light surfaces |
| `surface` / `paper` | `#F6F8F4` | App background |
| `surface-muted` / `mist` | `#DDE9E2` | Chip/tab track, muted fills |
| `border` / `mist` | `#DDE9E2` | Hairline borders on cards/inputs |
| `success` / `home` | `#2E7D32` | Healthy / home-care / positive |
| `warning` / `clinic` | `#B45309` | Clinic referral, pending sync |
| `danger` / `urgent` | `#C62828` | Urgent referral, errors, destructive |
| `info` / `neem` | `#1D6A50` | Informational notices |
| `focus` | `#1D6A50` | Keyboard focus ring |

### Contrast (WCAG AA requires >=4.5:1)

| Foreground / background | Ratio | Meets AA |
| --- | --- | --- |
| `white` / `urgent` | 5.6:1 | normal text |
| `white` / `warning` | 5.0:1 | normal text |
| `white` / `success` | 5.1:1 | normal text |
| `white` / `primary` | 6.5:1 | normal text |
| `white` / `primary-dark` | 11.1:1 | normal text |
| `ink` / `paper` | 15.4:1 | normal text |
| `primary-dark` / `paper` | 10.4:1 | normal text |
| `primary` / `paper` | 6.1:1 | normal text |
| `danger` / `paper` | 5.3:1 | normal text |
| `warning` / `paper` | 4.7:1 | normal text |
| `success` / `paper` | 4.8:1 | normal text |
| `neem-dark` / `white` | 11.1:1 | normal text |

Tinted fills (`bg-urgent/15`, `bg-neem/10`, ...) sit between the solid tone
and white, so text in them uses the ink/neem-dark scale for comfortable
contrast. If a new pairing is ever added, compute its ratio against these
before shipping.

## Type scale

`typeScale` in `src/theme/tokens.ts`, font **Mukta** (Latin + Devanagari).

| Utility | Size / line-height | Use for |
| --- | --- | --- |
| `text-big` | 44px / 1.1 | Hero numerals (PIN pad, readings) |
| `text-page` | 30px / 1.2 | Page titles |
| `text-section` | 22px / 1.3 | Section / group headings |
| `text-body` | 17px / 1.5 | **Default reading text** |
| `text-label` | 15px / 1.4 | Form hints, secondary meta |
| `text-caption` | 13.5px / 1.4 | Micro-meta — use sparingly, keep bold |

## Spacing, radius, elevation

- **Spacing:** Tailwind's 4px scale. Standard stack = 12–16px
  (`gap-3`/`mt-4`), form sections breathe with 32px (`gap-8`).
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
| `BigButton` | Thumb-sized button: `primary` / `secondary` / `ghost` / `danger` |
| `Field` | Label + control + hint/error block |
| `Input` styles (`.input`, `.textarea`) | One shared border/radius/height for every form control |
| `ToggleGroup` | aria-pressed segmented / pill option groups (single or multi) |
| `Badge` | Small pill: icon + label, `neutral/info/success/warning/danger` |
| `RiskBadge` | Risk pill (`urgent/clinic/home`) — icon + word, tinted |
| `RiskBanner` | Fixed risk header: colour + icon + title + reason lines |
| `Alert` | Non-blocking banner: `info/success/warning/danger/offline`, optional action |
| `StatusChip` | Sync state pill (online/syncing/offline/error) — icon + word |
| `SyncStatus` | Dashboard status card wrapping `StatusChip` + last-synced + Sync now |
| `Sheet` | Bottom-sheet modal (focus trap + Escape + return focus via `useDialog`) |
| `ConditionBadge` | Patient condition pill |
| `EmptyState`, `Skeleton`, `NumberPad`, `FilterTabs`, `FollowUpGroup`, `PatientCard`, `Toast`, `BottomNav`, `PageShell` | Screen-level patterns |

## Rules for contributors

- Change a colour/radius/size/text-step in `src/theme/tokens.ts` — never as
  an inline hex somewhere downstream.
- Keep every status visual icon + label + text; a colour change alone is
  never an acceptable signal.
- Reuse the shared components instead of re-styling raw elements; if a
  pattern repeats a third time, extract it.
- Verify with `npm run typecheck`, `npm test`, and a production build.