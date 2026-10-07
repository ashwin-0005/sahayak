import { useTranslation } from "react-i18next";
import { RISK_META } from "../lib/riskMeta";
import type { RiskLevel } from "../types";

// A risk level shown as icon + word on a solid fill. The fill + label read at
// a glance in bright light and without colour vision; the rationale text
// lives alongside it in the surrounding group/section. White text on all
// three fills (clinic orange included at ~6.6:1) — ink-on-clinic is only
// ~2.5:1 and fails WCAG AA.
const TONE: Record<RiskLevel, string> = {
  urgent: "bg-urgent text-white",
  clinic: "bg-clinic text-white",
  home: "bg-home text-white"
};

export function RiskBadge({ level, className = "" }: { level: RiskLevel; className?: string }) {
  const { t } = useTranslation();
  const Icon = RISK_META[level].icon;
  return (
    <span className={`badge font-bold ${TONE[level]} ${className}`}>
      <Icon className="size-4" aria-hidden="true" />
      <span>{t(`risk.${level}`)}</span>
    </span>
  );
}