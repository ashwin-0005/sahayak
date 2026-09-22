import type { ReactNode } from "react";
import { CircleCheck, CloudOff, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { BigButton } from "./BigButton";

export type AlertTone = "info" | "success" | "warning" | "danger" | "offline";

export interface AlertProps {
  tone: AlertTone;
  title: string;
  body?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  role?: "status" | "alert";
  className?: string;
  children?: ReactNode;
}

const TONE_BG: Record<AlertTone, string> = {
  offline: "bg-mist/60",
  danger: "bg-urgent/10",
  warning: "bg-clinic/15",
  info: "bg-neem/10",
  success: "bg-home/10"
};

const TONE_ICON: Record<AlertTone, string> = {
  offline: "text-neem-dark",
  danger: "text-urgent",
  warning: "text-clinic",
  info: "text-neem",
  success: "text-home"
};

const DEFAULT_ICON: Record<AlertTone, LucideIcon> = {
  offline: CloudOff,
  danger: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck
};

// Non-blocking status banner: icon + title + plain text, never colour alone,
// with an optional single action. Pass role="alert" for live errors.
export function Alert({
  tone,
  title,
  body,
  icon,
  actionLabel,
  onAction,
  role,
  className = "",
  children
}: AlertProps) {
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <div role={role} className={`alert ${TONE_BG[tone]} ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 size-5 shrink-0 ${TONE_ICON[tone]}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body font-extrabold leading-tight text-ink">{title}</p>
          {body ? <p className="mt-0.5 text-base leading-snug text-neem-dark">{body}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <BigButton variant="secondary" className="mt-3 w-full" onClick={onAction}>
          {actionLabel}
        </BigButton>
      ) : null}
      {children}
    </div>
  );
}