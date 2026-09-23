import type { ComponentType } from "react";
import { Check } from "lucide-react";

export type ToggleTone = "primary" | "success" | "danger";

interface ToggleOption<V extends string> {
  value: V;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: ToggleTone;
}

interface Common<V extends string> {
  label: string;
  title?: string;
  options: ToggleOption<V>[];
  className?: string;
  pill?: boolean;
  columns?: 2 | 3 | 4;
}

type Props<V extends string> =
  | (Common<V> & { multiple?: false; value: V | null; onChange: (v: V) => void })
  | (Common<V> & { multiple: true; value: readonly V[]; onChange: (v: V[]) => void });

// Selection is never conveyed by colour alone: the active option always gets
// a check glyph too. Tones use the decoupled SYSTEM tokens (success/danger),
// not the clinical risk palette — so picking "No" or a symptom is a form
// state, never a risk verdict.
const ACTIVE: Record<ToggleTone, string> = {
  primary: "bg-neem text-white",
  success: "bg-success text-white",
  danger: "bg-danger text-white"
};

const COLS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4"
};

// Segmented / pill option groups for one-finger entry. Buttons (not links)
// with aria-pressed, at least 48–56px tall, and an optional visible title
// kept aria-hidden because the group label names the control set.
export function ToggleGroup<V extends string>({
  label,
  title,
  options,
  value,
  onChange,
  pill = false,
  columns = 2,
  multiple = false,
  className = ""
}: Props<V>) {
  const isActive = (v: V): boolean => {
    if (multiple) return (value as readonly V[]).includes(v);
    return (value as V | null) === v;
  };
  const select = (v: V): void => {
    if (multiple) {
      const current = value as readonly V[];
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      (onChange as (vv: V[]) => void)(next);
      return;
    }
    (onChange as (vv: V) => void)(v);
  };
  const grid = COLS[columns];
  return (
    <div role="group" aria-label={label} className={className}>
      {title ? (
        <span aria-hidden="true" className="block text-body font-bold text-ink">
          {title}
        </span>
      ) : null}
      <div
        className={`${pill ? "flex flex-wrap gap-2" : `grid gap-3 ${grid}`} ${title ? "mt-2" : ""}`}
      >
        {options.map((opt) => {
          const active = isActive(opt.value);
          const OptionIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => select(opt.value)}
              className={
                pill
                  ? `tag min-h-[48px] transition-colors ${active ? ACTIVE[opt.tone ?? "primary"] : "bg-mist text-neem-dark"}`
                  : `min-h-[56px] rounded-button text-body font-bold transition-colors ${active ? ACTIVE[opt.tone ?? "primary"] : "bg-mist text-neem-dark"}`
              }
            >
              {OptionIcon ? <OptionIcon className="size-5" aria-hidden="true" /> : null}
              {active ? <Check className="size-5" aria-hidden="true" /> : null}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}