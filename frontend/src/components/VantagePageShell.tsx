import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Menu, X } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { BottomNav } from "./BottomNav";
import type { ReactNode } from "react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4";

interface VantagePageShellProps {
  children: ReactNode;
  noNav?: boolean;
  headerActions?: ReactNode;
  hideTime?: boolean;
}

export function VantagePageShell({
  children,
  noNav = false,
  headerActions,
  hideTime = false,
}: VantagePageShellProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionSettled, setMotionSettled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const locale = i18n.language === "hi" ? "hi-IN" : "en-IN";
  const timeLabel = now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  const openLogin = (workerId?: string) => {
    navigate("/login", workerId ? { state: { workerId } } : undefined);
  };

  useEffect(() => {
    if (motionSettled) return;
    const html = document.documentElement;
    const settle = () => {
      html.classList.remove("motion-pending");
      setMotionSettled(true);
    };
    html.classList.add("motion-pending");
    const fallback = window.setTimeout(settle, 3500);
    return () => {
      window.clearTimeout(fallback);
      html.classList.remove("motion-pending");
    };
  }, [motionSettled]);

  const onSentinelAnimationEnd = () => {
    if (!motionSettled) {
      document.documentElement.classList.remove("motion-pending");
      setMotionSettled(true);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navItems = [
    { key: "navOverview", to: "/", workerId: undefined },
    { key: "navDemo", to: "/login", workerId: "demo" },
    { key: "navApp", to: "/login", workerId: undefined },
  ];

  return (
    <section className="vp-screen font-display">
      <video
        className="vp-background"
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="vp-content flex h-full flex-col" ref={sentinelRef} onAnimationEnd={onSentinelAnimationEnd}>
        <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 pt-5 sm:px-10 sm:pt-7">
          <div className="motion-fade flex items-center gap-3" style={{ animationDelay: "60ms" }}>
            <span
              className="grid size-9 place-items-center rounded-full border border-white/25 bg-white text-night shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              aria-hidden="true"
            >
              <ClipboardList className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">{t("app.name")}</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <nav className="flex items-center gap-7" aria-label={t("a11y.navPrimary")}>
              {navItems.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  className={`motion-fade text-body font-medium transition-colors ${
                    i === 0 ? "text-white" : "text-white/60 hover:text-white"
                  }`}
                  style={{ animationDelay: `${130 + i * 45}ms` }}
                  onClick={() => openLogin(item.workerId)}
                >
                  {t(`landing.${item.key}`)}
                </button>
              ))}
            </nav>

            {!hideTime && (
              <div
                className="motion-fade hidden items-center gap-3 border-l-2 border-white/25 pl-5 text-body font-medium text-white"
                style={{ animationDelay: "180ms" }}
              >
                <span>{timeLabel}</span>
                <span className="text-white/30">•</span>
                <span>{dateLabel}</span>
              </div>
            )}

            {headerActions ? (
              <div className="motion-fade" style={{ animationDelay: "220ms" }}>
                {headerActions}
              </div>
            ) : (
              <button
                type="button"
                className="motion-fade min-h-[42px] rounded-lg border border-white/20 bg-white/10 px-6 text-body font-semibold text-white backdrop-blur-md transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
                style={{ animationDelay: "220ms" }}
                onClick={() => openLogin()}
              >
                {t("landing.signIn")}
              </button>
            )}
          </div>

          <button
            type="button"
            className="motion-fade grid size-12 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md md:hidden"
            style={{ animationDelay: "140ms" }}
            aria-label={menuOpen ? t("landing.closeMenu") : t("landing.menuLabel")}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </header>

        {menuOpen ? (
          <div
            role="menu"
            aria-label={t("landing.menuLabel")}
            className="glass-panel animate-panel-up mx-4 mt-3 flex flex-col gap-1 p-3 md:hidden"
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className="min-h-[48px] rounded-lg px-4 text-left text-body font-semibold text-white/85 hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setMenuOpen(false);
                    openLogin(item.workerId);
                  }
                }}
              >
                {t(`landing.${item.key}`)}
              </button>
            ))}
            <div className="mt-1 flex flex-col gap-3 border-t border-white/10 pt-3">
              {!hideTime && (
                <p className="px-1 text-support text-white/60">
                  <span className="text-white/90">{timeLabel}</span>
                  <span className="mx-2 text-white/25">•</span>
                  {dateLabel}
                </p>
              )}
              <button
                type="button"
                className="btn-primary min-h-[48px] px-4 py-3 text-body"
                onClick={() => {
                  setMenuOpen(false);
                  openLogin();
                }}
              >
                {t("landing.signIn")}
              </button>
              <LanguageToggle variant="pill" />
            </div>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto pb-28">
          {children}
        </main>

        {!noNav && <BottomNav />}
      </div>
    </section>
  );
}