import { useTranslation } from "react-i18next";

interface NumberPadProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  label: string;
}

// On-screen numeric entry for readings and PINs. Big keys, works with one hand.
export function NumberPad({ value, onChange, maxLength = 4, label }: NumberPadProps) {
  const { t } = useTranslation();
  const press = (k: string) => {
    if (value.length >= maxLength) return;
    onChange(value + k);
  };

  const back = () => onChange(value.slice(0, -1));

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <label className="text-section font-semibold" id={`numpad-${label}`}>
          {label}
        </label>
        <span
          className="font-mukta text-4xl font-extrabold tabular-nums tracking-widest"
          aria-live="polite"
        >
          {(value || "\u00A0").padEnd(Math.max(maxLength - value.length, 0), "\u00A0") || value}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3" role="group" aria-labelledby={`numpad-${label}`}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="num-key"
            aria-label={k === "back" ? t("a11y.delete") : k}
            onClick={() => (k === "back" ? back() : press(k))}
          >
            {k === "back" ? "⌫" : k}
          </button>
        ))}
      </div>
    </div>
  );
}