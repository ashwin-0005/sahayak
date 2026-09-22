import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BigButton } from "./BigButton";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-mist/50 p-8 text-center">
      <Icon className="size-16 text-neem" aria-hidden="true" />
      <p className="text-section font-extrabold text-ink">{title}</p>
      {body ? <p className="text-body text-neem-dark">{body}</p> : null}
      {actionLabel && onAction ? (
        <BigButton variant="secondary" className="mt-2" onClick={onAction}>
          {actionLabel}
        </BigButton>
      ) : null}
      {children}
    </div>
  );
}