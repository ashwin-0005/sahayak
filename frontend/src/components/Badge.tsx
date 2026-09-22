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
// status is ever conveyed by colour alone.
const TONE: Record<BadgeTone, string> = {
  neutral: "bg-mist text-neem-dark",
  info: "bg-neem/15 text-neem-dark",
  success: "bg-home/15 text-neem-dark",
  warning: "bg-clinic/15 text-ink",
  danger: "bg-urgent/15 text-urgent",
  "danger-solid": "bg-urgent text-white"
};

export function Badge({ children, icon: Icon, tone = "neutral", className = "", role }: BadgeProps) {
  return (
    <span role={role} className={`badge ${TONE[tone]} ${className}`}>
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}