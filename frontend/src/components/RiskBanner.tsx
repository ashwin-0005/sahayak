import { useTranslation } from "react-i18next";
import { RISK_META } from "../lib/riskMeta";
import type { RiskLevel } from "../types";

interface RiskBannerProps {
  level: RiskLevel;
  reasonKeys?: string[];
  className?: string;
}

// Fixed header banner: color + icon + words together, never color alone.
export function RiskBanner({ level, reasonKeys = [], className = "" }: RiskBannerProps) {
  const { t } = useTranslation();
  const meta = RISK_META[level];
  const Icon = meta.icon;
  return (
    <div
      className={`${className} flex items-center gap-3 rounded-card px-4 py-3 ${
        // Ink text on clinic orange: white-on-orange fails contrast (2.69:1).
        level === "clinic" ? "text-ink" : "text-white"
      }`}
      style={{ backgroundColor: meta.bg }}
      role="status"
    >
      <Icon className="size-7 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-extrabold">{t(`risk.${level}`)}</p>
        {reasonKeys.map((key) => (
          <p key={key} className="text-support leading-snug">
            {t(key)}
          </p>
        ))}
      </div>
    </div>
  );
}