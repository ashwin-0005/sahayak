import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, Download, Share2 } from "lucide-react";
import { loginOnline, unlockOffline } from "../auth/auth";
import { NumberPad } from "../components/NumberPad";
import { BigButton } from "../components/BigButton";
import { Field } from "../components/Field";
import { Alert } from "../components/Alert";
import { LanguageToggle } from "../components/LanguageToggle";
import { syncNow } from "../sync/syncEngine";
import { ApiErrorClass } from "../lib/api";
import { useSlowNotice } from "../lib/useSlow";
import { withRetry } from "../lib/retry";
import { WakeNotice } from "../components/WakeNotice";
import { Sheet } from "../components/Sheet";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // "/" is the public landing page since the Landing feature — the dashboard is "/home".
  const from = (location.state as { from?: string; workerId?: string } | null)?.from ?? "/home";
  // The landing page's demo button pre-fills the public demo worker ID.
  const prefillId = (location.state as { from?: string; workerId?: string } | null)?.workerId ?? "";

  const [workerId, setWorkerId] = useState(prefillId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slowLogin = useSlowNotice(busy, 2000);

  const online = navigator.onLine;

  // --- PWA Install logic ---
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  // Detect iOS Safari (excludes Chrome/Firefox on iOS which use same engine but no programmatic install)
  const detectIos = () => {
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    // iOS Chrome/Firefox use WebKit but still can't install PWA programmatically
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    return isIosDevice && isSafari;
  };

  // Check if app is already installed (standalone mode)
  const checkInstalled = () => {
    if (typeof window.matchMedia === "function") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    }
    return (window.navigator as any).standalone === true;
  };

  useEffect(() => {
    // Detect iOS Safari
    const ios = detectIos();
    setIsIos(ios);

    // Check if already installed
    const installed = checkInstalled();
    setIsInstalled(installed);

    // Listen for beforeinstallprompt (Android/Chrome, Edge, etc.)
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);

    // Listen for appinstalled event
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosSheet(true);
      return;
    }
    if (installEvt) {
      await installEvt.prompt();
      const choice = await installEvt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setInstallEvt(null);
      }
    }
  };

  const submit = async () => {
    if (!workerId.trim() || pin.length < 4 || pin.length > 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (online) {
        // Cold starts can drop the first attempt; retry transient failures
        // (never auth errors — a wrong PIN fails fast, once).
        await withRetry(() => loginOnline(workerId.trim(), pin));
      } else {
        await unlockOffline(workerId.trim(), pin);
      }
      void syncNow();
      navigate(from, { replace: true });
    } catch (e) {
      // Every failure gets a truthful, non-sensitive message. In particular
      // a dead server must never masquerade as "wrong PIN".
      if (e instanceof ApiErrorClass) {
        if (e.code === "TIMEOUT") setError(t("login.timeoutError"));
        else if (e.code === "LOCKED_OUT" || e.code === "ACCOUNT_LOCKED" || e.code === "RATE_LIMITED")
          setError(t("login.lockedOut"));
        else if (e.code === "NO_SESSION") setError(t("login.noSavedAccount"));
        else if (e.code === "INVALID_CREDENTIALS") setError(t("login.error"));
        else setError(t("login.connectionError"));
      } else {
        setError(t("login.connectionError"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5 py-10">
      <div className="glass-panel animate-panel-up w-full p-6">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-white/15 bg-white/10"
              aria-hidden="true"
            >
              <ClipboardList className="size-6 text-neem-300" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-page font-extrabold text-white">{t("app.name")}</h1>
              <p className="text-body leading-snug text-white/70">{t("app.tagline")}</p>
            </div>
          </div>
          <LanguageToggle variant="pill" />
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 text-support font-semibold text-white/70">
            {t(online ? "login.subtitle" : "login.unlockOffline")}
          </div>

          <div className="mt-2">
            <Field label={t("login.workerId")} htmlFor="workerId">
              <input
                id="workerId"
                className="input"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                inputMode="text"
                autoCapitalize="none"
                autoComplete="username"
              />
            </Field>
          </div>

          <div className="mt-6">
            <NumberPad value={pin} onChange={setPin} maxLength={6} label={t("login.pin")} id="pin" />
          </div>

          {error ? <Alert tone="danger" role="alert" title={error} className="mt-3" /> : null}

          <BigButton
            className="mt-6"
            disabled={!workerId.trim() || pin.length < 4 || pin.length > 6 || busy}
            onClick={() => void submit()}
          >
            {busy ? t("common.loading") : t("login.submit")}
          </BigButton>
          {busy && slowLogin ? (
            <div className="mt-3">
              <WakeNotice />
            </div>
          ) : null}

          {/* PWA Install button - below the login form, conditional rendering */}
          {!isInstalled && (isIos || installEvt) && (
            <div className="mt-4">
              <BigButton
                variant="secondary"
                icon={Download}
                onClick={handleInstallClick}
                className="w-full"
              >
                {t("login.install")}
              </BigButton>
            </div>
          )}

          {isInstalled && (
            <div className="mt-4 flex items-center justify-center gap-2 text-support text-white/70">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Download className="size-3 text-neem-300" aria-hidden="true" />
              </span>
              <span className="text-body font-medium">{t("login.installed")}</span>
            </div>
          )}

          {/* iOS Install Instructions Sheet */}
          <Sheet
            open={showIosSheet}
            onClose={() => setShowIosSheet(false)}
            ariaLabel={t("login.installIosTitle")}
            describedBy="ios-install-instructions"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Share icon illustration */}
              <div className="flex items-center justify-center gap-2 p-4 rounded-full bg-neem/10">
                <Share2 className="size-8 text-neem" aria-hidden="true" />
              </div>
              <h2 className="text-section font-extrabold">{t("login.installIosTitle")}</h2>
              <div id="ios-install-instructions" className="space-y-3 text-body text-ink w-full">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 size-8 rounded-full bg-neem text-white flex items-center justify-center font-extrabold">1</span>
                  <p className="text-left">{t("login.installIosStep1")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 size-8 rounded-full bg-neem text-white flex items-center justify-center font-extrabold">2</span>
                  <p className="text-left">{t("login.installIosStep2")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 size-8 rounded-full bg-neem text-white flex items-center justify-center font-extrabold">3</span>
                  <p className="text-left">{t("login.installIosStep3")}</p>
                </div>
              </div>
              <BigButton variant="primary" className="w-full" onClick={() => setShowIosSheet(false)}>
                {t("common.ok")}
              </BigButton>
            </div>
          </Sheet>
        </div>
      </div>
    </div>
  );
}