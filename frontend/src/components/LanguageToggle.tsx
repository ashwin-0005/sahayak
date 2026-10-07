import { useTranslation } from "react-i18next";
import { setLanguage, languageLabel, type UILang } from "../i18n";

type Variant = "full" | "pill";

interface LanguageToggleProps {
  labelKey?: string;
  variant?: Variant;
  className?: string;
}

export function LanguageToggle({ labelKey, variant = "full", className = "" }: LanguageToggleProps) {
  const { t, i18n } = useTranslation();
  const current = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";

  const options: { value: UILang; label: string }[] = [
    { value: "en", label: languageLabel.en },
    { value: "hi", label: languageLabel.hi }
  ];

  if (variant === "pill") {
    return (
      <div
        role="group"
        aria-label={labelKey ? t(labelKey) : undefined}
        className={`flex items-center gap-2 ${className}`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLanguage(opt.value)}
            aria-pressed={current === opt.value}
            className={`tag min-h-[48px] transition-colors ${
              current === opt.value ? "bg-neem text-white" : "bg-mist text-neem-dark"
            }`}
          >
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={labelKey ? t(labelKey) : undefined}
      className={`grid grid-cols-2 gap-3 ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLanguage(opt.value)}
          aria-pressed={current === opt.value}
          className={`min-h-[56px] rounded-button text-body font-bold ${
            current === opt.value ? "bg-neem text-white" : "bg-mist text-neem-dark"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}