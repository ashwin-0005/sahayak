import { useTranslation } from "react-i18next";
import { RISK_META } from "../lib/riskMeta";
import type { RiskLevel } from "../types";

// A risk level shown as icon + word on a solid fill. The fill + label read at
// a glance in bright light and without colour vision; the rationale text
// lives alongside it in the surrounding group/section.
const TONE: Record<RiskLevel, string> = {
  urgent: "bg-urgent text-white",
  clinic: "bg-clinic text-ink",
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