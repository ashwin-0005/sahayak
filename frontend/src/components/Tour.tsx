import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TourStep {
  key: "tour.sync" | "tour.addFollowUp" | "tour.nav";
  target: "sync" | "addFollowUp" | "nav";
}

const STEPS: TourStep[] = [
  { key: "tour.sync", target: "sync" },
  { key: "tour.addFollowUp", target: "addFollowUp" },
  { key: "tour.nav", target: "nav" },
];

interface TourProps {
  targets: Record<TourStep["target"], HTMLElement | null>;
  onDone: () => void;
}

export function Tour({ targets, onDone }: TourProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: "top" | "bottom" } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const advance = () => {
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  };

  // Position bubble relative to the target, clamped inside the viewport.
  const recompute = () => {
    const el = targets[step.target];
    if (!el) {
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const bw = Math.min(320, window.innerWidth - 32);
    const gap = 12;
    // Prefer below the target; if not enough room below, place above.
    const bubbleH = bubbleRef.current?.offsetHeight ?? 110;
    const preferBelow = r.bottom + gap + bubbleH < window.innerHeight - 8;
    const arrow: "top" | "bottom" = preferBelow ? "top" : "bottom";
    const top = preferBelow ? r.bottom + gap : r.top - gap - bubbleH;
    const idealLeft = r.left + r.width / 2 - bw / 2;
    const left = Math.max(16, Math.min(idealLeft, window.innerWidth - bw - 16));
    setPos({ top: Math.max(8, top), left, arrow });
  };

  useLayoutEffect(() => {
    recompute();
    // Recompute on scroll/resize and after fonts load.
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, targets]);

  // Also recompute once the bubble has rendered and its height is known.
  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.arrow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  // Highlight the target with a ring; scroll it into view.
  useEffect(() => {
    const el = targets[step.target];
    if (!el) return;
    el.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    const prevOutline = el.style.outline;
    const prevOutlineOffset = el.style.outlineOffset;
    el.style.outline = "3px solid #1D6A50";
    el.style.outlineOffset = "2px";
    return () => {
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOutlineOffset;
    };
  }, [step.target, targets]);

  if (!pos) return null;

  const bw = Math.min(320, window.innerWidth - 32);
  const targetRect = targets[step.target]?.getBoundingClientRect();
  // Arrow horizontal position relative to bubble.
  const arrowLeft = targetRect
    ? Math.min(bw - 24, Math.max(16, targetRect.left + targetRect.width / 2 - pos.left))
    : bw / 2;

  return (
    <div
      ref={bubbleRef}
      role="dialog"
      aria-label={t("tour.step", { current: index + 1, total: STEPS.length })}
      aria-live="polite"
      className="tour-bubble fixed z-50 rounded-card border border-white/16 bg-night-raised/95 p-4 shadow-raised"
      style={{ top: pos.top, left: pos.left, width: bw }}
    >
      {/* Arrow */}
      <span
        aria-hidden="true"
        className="absolute h-3 w-3 rotate-45 border-white/16 bg-night-raised/95"
        style={
          pos.arrow === "top"
            ? { top: -6, left: arrowLeft, borderTopWidth: 1, borderLeftWidth: 1 }
            : { bottom: -6, left: arrowLeft, borderRightWidth: 1, borderBottomWidth: 1 }
        }
      />
      <p className="pr-2 text-body leading-snug text-white">{t(step.key)}</p>
      <p className="mt-1 text-support text-white/60">{t("tour.step", { current: index + 1, total: STEPS.length })}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className="min-h-[40px] px-2 text-body font-semibold text-white/70" onClick={onDone}>
          {t("tour.skip")}
        </button>
        <button type="button" className="btn-primary min-h-[40px] px-5 py-2 text-body" onClick={advance}>
          {isLast ? t("tour.done") : t("tour.next")}
        </button>
      </div>
    </div>
  );
}
