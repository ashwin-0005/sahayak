import { useTranslation } from "react-i18next";
import { RISK_META } from "../lib/riskMeta";
import type { RiskLevel } from "../types";

// A risk level shown as icon + word, tinted but never colour-only. The
// rationale text lives alongside it in the surrounding group/section.
const TONE: Record<RiskLevel, string> = {
  urgent: "bg-urgent/15 text-urgent",
  clinic: "bg-clinic/15 text-ink",
  home: "bg-home/15 text-neem-dark"
};

export function RiskBadge({ level, className = "" }: { level: RiskLevel; className?: string }) {
  const { t } = useTranslation();
  const Icon = RISK_META[level].icon;
  return (
    <span className={`badge ${TONE[level]} ${className}`}>
      <Icon className="size-4" aria-hidden="true" />
      <span>{t(`risk.${level}`)}</span>
    </span>
  );
}