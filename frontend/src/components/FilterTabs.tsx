import type { ReactNode } from "react";

export interface FilterOption<K extends string> {
  key: K;
  label: string;
  count: ReactNode;
}

interface FilterTabsProps<K extends string> {
  options: FilterOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}

// Segmented filter with a count badge per option. Buttons (not links) with
// aria-pressed, so the active segment is announced regardless of color, and
// every target is 52px tall for thumb-sized use in the field.
export function FilterTabs<K extends string>({ options, value, onChange, label }: FilterTabsProps<K>) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-4 gap-1.5 rounded-button border border-white/15 bg-white/[0.08] p-1.5 backdrop-blur-md">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.key)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-button px-1 py-1.5 text-center transition-colors duration-100 ${
              active
                ? "bg-white text-neem shadow-raised"
                : "text-white/60 active:bg-white/15"
            }`}
          >
            <span className={`text-body font-extrabold leading-none tabular-nums ${active ? "text-neem" : "text-white/80"}`}>
              {opt.count}
            </span>
            <span className="text-support font-bold leading-tight">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}