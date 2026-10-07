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

// Tone fills come from the CSS tone classes (`.alert-danger` etc.) — frosted
// light tints tuned for the dark canvas. Tailwind bg-* utilities would replace
// the light background entirely and leave ink text on near-black.
const TONE_BG: Record<AlertTone, string> = {
  offline: "alert-offline",
  danger: "alert-danger",
  warning: "alert-warning",
  info: "alert-info",
  success: "alert-success"
};

const TONE_ICON: Record<AlertTone, string> = {
  offline: "text-offline",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  success: "text-success"
};

const DEFAULT_ICON: Record<AlertTone, LucideIcon> = {
  offline: CloudOff,
  danger: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck
};

// Non-blocking status banner: icon + title + plain text, never colour alone,
// with an optional single action. Pass role="alert" for live errors. Tones
// use the decoupled SYSTEM tokens — an info/success/warning/danger banner is
// never a clinical risk state.
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
          {body ? <p className="mt-0.5 text-support leading-snug text-neem-dark">{body}</p> : null}
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