import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FollowUpGroupProps {
  title: string;
  // Plain-language one-liner explaining what this group means.
  explain?: string;
  icon: LucideIcon;
  color: string;
  // Shows a right-aligned headline number for the groups that matter most
  // (urgent / overdue). Other groups omit it and stay quiet.
  count?: number;
  countColor?: string;
  children: ReactNode;
}

// A named section of the Today dashboard: colored icon + title + a short
// text explanation, then the list of patient cards underneath. Falls back to
// the token spacing rhythm (section gap above, card gap between rows).
export function FollowUpGroup({ title, explain, icon: Icon, color, count, countColor = color, children }: FollowUpGroupProps) {
  return (
    <section aria-label={title} className="mt-section">
      <header className="flex items-center gap-2.5">
        <span
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-3.5 text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-section font-extrabold leading-tight text-ink">{title}</h2>
          {explain ? <p className="mt-0.5 text-support leading-snug text-neem-dark">{explain}</p> : null}
        </div>
        {count !== undefined ? (
          <span className="ml-auto flex shrink-0 items-center gap-2" aria-label={`${title}: ${count}`}>
            <span
              className="text-display font-extrabold leading-none tabular-nums"
              style={{ color: countColor }}
            >
              {count}
            </span>
          </span>
        ) : null}
      </header>
      <div className="mt-3 flex flex-col gap-card">{children}</div>
    </section>
  );
}