import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, Menu, X } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";

// The Vantage-style hero: a full-bleed cinematic video, a vignette, a
// two-line display headline with a whitespace reveal, a white pill CTA with a
// dark arrow box, and a dark-glass "Try the demo" card in the bottom-right.
// All motion is gated behind `html.motion-pending` (see index.css) so it only
// runs once on first paint and collapses cleanly for reduced motion.

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4";

const HEADLINE_SCALE: readonly [number, number] = [0.775, 0.793];

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Entrance choreography lives on <html> so it works even if React re-renders.
  useEffect(() => {
    const html = document.documentElement;
    const settle = () => html.classList.remove("motion-pending");
    html.classList.add("motion-pending");
    const fallback = window.setTimeout(settle, 3500);
    return () => {
      window.clearTimeout(fallback);
      html.classList.remove("motion-pending");
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Settle early once the demo card finishes its entrance so the page looks
  // stable instead of waiting for the 3.5s fallback.
  const onCardSettled = () => {
    document.documentElement.classList.remove("motion-pending");
  };

  const openLogin = (workerId?: string) => {
    navigate("/login", workerId ? { state: { workerId } } : undefined);
  };

  const now = useMemo(() => new Date(), []);
  const locale = i18n.language === "hi" ? "hi-IN" : "en-IN";
  const timeLabel = now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  const navItems = [
    { key: "navOverview", to: "/", workerId: undefined },
    { key: "navDemo", to: "/login", workerId: "demo" },
    { key: "navApp", to: "/login", workerId: undefined }
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

      <div className="vp-content flex h-full flex-col">
        <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 pt-5 sm:px-10 sm:pt-7">
          {/* Brand */}
          <div className="motion-fade flex items-center gap-3" style={{ animationDelay: "60ms" }}>
            <span
              className="grid size-9 place-items-center rounded-full border border-white/25 bg-white text-night shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              aria-hidden="true"
            >
              <ClipboardList className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">{t("app.name")}</span>
          </div>

          {/* Desktop nav row */}
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

            {/* Time panel */}
            <div
              className="motion-fade hidden items-center gap-3 border-l-2 border-white/25 pl-5 text-body font-medium text-white"
              style={{ animationDelay: "180ms" }}
            >
              <span>{timeLabel}</span>
              <span className="text-white/30">•</span>
              <span>{dateLabel}</span>
            </div>

            <button
              type="button"
              className="motion-fade min-h-[42px] rounded-lg border border-white/20 bg-white/10 px-6 text-body font-semibold text-white backdrop-blur-md transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              style={{ animationDelay: "220ms" }}
              onClick={() => openLogin()}
            >
              {t("landing.signIn")}
            </button>
          </div>

          {/* Mobile menu toggle */}
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

        {/* Mobile dropdown */}
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
              <p className="px-1 text-support text-white/60">
                <span className="text-white/90">{timeLabel}</span>
                <span className="mx-2 text-white/25">•</span>
                {dateLabel}
              </p>
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

        {/* Bottom region: hero + demo card */}
        <div className="relative flex-1">
          {/* Hero copy, bottom-left */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start px-4 pb-24 sm:px-10 sm:pb-16">
            <h1 className="max-w-[720px]">
              <span
                className="motion-line block whitespace-normal text-4xl font-medium leading-[1.08] tracking-[-1.5px] text-white sm:text-6xl md:whitespace-nowrap md:text-7xl"
                style={{
                  transform: `scaleX(${HEADLINE_SCALE[0]})`,
                  transformOrigin: "left center",
                  textShadow: "0 2px 2px rgba(0,0,0,0.44)"
                }}
              >
                <span className="line-reveal" style={{ animationDelay: "300ms" }}>
                  {t("landing.headline1")}
                </span>
              </span>
              <span
                className="motion-line block whitespace-normal text-4xl font-medium leading-[1.08] tracking-[-1.5px] sm:text-6xl md:whitespace-nowrap md:text-7xl"
                style={{
                  transform: `scaleX(${HEADLINE_SCALE[1]})`,
                  transformOrigin: "left center",
                  color: "rgba(211,207,207,0.82)",
                  textShadow: "0 2px 2px rgba(0,0,0,0.44)"
                }}
              >
                <span className="line-reveal" style={{ animationDelay: "440ms" }}>
                  {t("landing.headline2")}
                </span>
              </span>
            </h1>

            <p
              id="hero-copy"
              className="motion-fade mt-4 max-w-[460px] text-body font-normal leading-relaxed text-white/80"
              style={{ animationDelay: "740ms" }}
            >
              {t("landing.copy1")}
              <br />
              {t("landing.copy2")}
              <br />
              {t("landing.copy3")}
            </p>

            <button
              type="button"
              className="motion-rise relative mt-7 min-h-[56px] overflow-hidden rounded-lg bg-white pl-7 pr-[58px] text-body font-semibold text-night transition-[filter,transform] hover:brightness-110 active:scale-[0.99]"
              style={{ animationDelay: "960ms" }}
              onClick={() => openLogin()}
            >
              <span>{t("landing.cta")}</span>
              <span className="absolute right-[7px] top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md bg-night text-white">
                <ArrowRight className="size-5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              className="motion-fade mt-4 text-body font-semibold text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white"
              style={{ animationDelay: "1000ms" }}
              onClick={() => openLogin("demo")}
            >
              {t("landing.tryDemo")}
            </button>
          </div>

          {/* Demo / sign-in glass card, bottom-right (desktop) or under the
              header on mobile */}
          <aside
            onAnimationEnd={onCardSettled}
            aria-label={t("landing.demoCardTitle")}
            className="glass-panel motion-rise absolute right-4 top-[96px] w-[210px] p-5 sm:right-8 md:top-[auto] md:bottom-[8svh] md:w-[300px] md:p-6"
            style={{ animationDelay: "1040ms", transformOrigin: "82% 50%" }}
          >
            <p className="text-support font-semibold uppercase tracking-widest text-white/50">
              {t("landing.demoCardTitle")}
            </p>
            <p className="mt-2 text-body leading-snug text-white/85">{t("landing.demoCardBody")}</p>
            <p className="mt-4 text-support text-white/60">{t("landing.demoCardId")}</p>
            <p className="text-support text-white/60">{t("landing.demoCardPin")}</p>
            <button
              type="button"
              className="mt-5 min-h-[48px] w-full rounded-lg border border-white/20 bg-white/[0.09] px-4 text-body font-semibold text-white backdrop-blur-md transition-[filter,background-color] hover:bg-white/15 hover:brightness-110"
              onClick={() => openLogin("demo")}
            >
              {t("landing.openDemo")}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}