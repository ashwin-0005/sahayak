import { useTranslation } from "react-i18next";

interface NumberPadProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  label: string;
  // Stable ASCII id — the visible label is translated (spaces/parens break
  // aria-labelledby, which tokenizes on whitespace), so the accessible name
  // must derive from this, never from the label text.
  id: string;
}

// On-screen numeric entry for readings and PINs. Big keys, works with one
// hand. Digits + backspace only — PINs and readings are never decimal.
export function NumberPad({ value, onChange, maxLength = 4, label, id }: NumberPadProps) {
  const { t } = useTranslation();
  const labelId = `numpad-label-${id}`;
  const press = (k: string) => {
    if (value.length >= maxLength) return;
    onChange(value + k);
  };

  const back = () => onChange(value.slice(0, -1));

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "back"];

  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <label className="text-body font-bold" id={labelId}>
          {label}
        </label>
        <span
          className="font-mukta text-display font-extrabold tabular-nums tracking-widest"
          role="status"
          aria-label={label}
        >
          {(value || "\u00A0").padEnd(Math.max(maxLength - value.length, 0), "\u00A0") || value}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3" role="group" aria-labelledby={labelId}>
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