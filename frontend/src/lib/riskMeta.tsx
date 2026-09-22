import type { LucideIcon } from "lucide-react";
import { AlertOctagon, Building2, HeartPulse } from "lucide-react";
import { colorToken } from "../theme/tokens";
import type { RiskLevel } from "../types";

export interface RiskMeta {
  color: string;
  bg: string;
  icon: LucideIcon;
}

// Color comes from the shared design tokens so the palette can never drift.
// Risk also always travels with an icon and words (see RiskBadge/RiskBanner).
export const RISK_META: Record<RiskLevel, RiskMeta> = {
  urgent: { color: colorToken.urgent, bg: colorToken.urgent, icon: AlertOctagon },
  clinic: { color: colorToken.clinic, bg: colorToken.clinic, icon: Building2 },
  home: { color: colorToken.home, bg: colorToken.home, icon: HeartPulse }
};

// Map a risk level to the "reason in plain words" i18n key.
export function riskReasonKeys(reasonCodes: string[]): string[] {
  return reasonCodes.map((c) => `reason.${c}` as const);
}

export function instructionKey(level: RiskLevel): `risk.instructionUrgent` | `risk.instructionClinic` | `risk.instructionHome` {
  if (level === "urgent") return "risk.instructionUrgent";
  if (level === "clinic") return "risk.instructionClinic";
  return "risk.instructionHome";
}