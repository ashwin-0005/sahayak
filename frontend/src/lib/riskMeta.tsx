import type { LucideIcon } from "lucide-react";
import { AlertOctagon, Building2, HeartPulse } from "lucide-react";
import type { RiskLevel } from "../types";

export interface RiskMeta {
  color: string;
  bg: string;
  icon: LucideIcon;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  urgent: { color: "#C62828", bg: "#C62828", icon: AlertOctagon },
  clinic: { color: "#E08A00", bg: "#E08A00", icon: Building2 },
  home: { color: "#2E7D32", bg: "#2E7D32", icon: HeartPulse }
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