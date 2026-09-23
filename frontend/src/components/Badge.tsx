import type { ComponentType, ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "danger-solid";

interface BadgeProps {
  children: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: BadgeTone;
  className?: string;
  role?: "status" | "alert";
}

// Tone is a tinted hint — the label text always carries the meaning, so no
// status is ever conveyed by colour alone. Tones use the decoupled SYSTEM
// tokens; risk states render through RiskBadge with the risk palette instead.
const TONE: Record<BadgeTone, string> = {
  neutral: "bg-mist text-neem-dark",
  info: "bg-info/15 text-neem-dark",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-ink",
  danger: "bg-danger/15 text-danger",
  "danger-solid": "bg-danger text-white"
};

export function Badge({ children, icon: Icon, tone = "neutral", className = "", role }: BadgeProps) {
  return (
    <span role={role} className={`badge ${TONE[tone]} ${className}`}>
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}