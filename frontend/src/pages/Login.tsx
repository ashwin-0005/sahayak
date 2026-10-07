import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Download, Share2 } from "lucide-react";
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
import { VantagePageShell } from "../components/VantagePageShell";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; workerId?: string } | null)?.from ?? "/home";
  const prefillId = (location.state as { from?: string; workerId?: string } | null)?.workerId ?? "";

  const [workerId, setWorkerId] = useState(prefillId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slowLogin = useSlowNotice(busy, 2000);

  const online = navigator.onLine;

  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  const detectIos = () => {
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    return isIosDevice && isSafari;
  };

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
    const ios = detectIos();
    setIsIos(ios);
    const installed = checkInstalled();
    setIsInstalled(installed);
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
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
        await withRetry(() => loginOnline(workerId.trim(), pin));
      } else {
        await unlockOffline(workerId.trim(), pin);
      }
      void syncNow();
      navigate(from, { replace: true });
    } catch (e) {
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
    <VantagePageShell
      noNav
      hideTime
      headerActions={<LanguageToggle variant="pill" />}
    >
      <div className="flex flex-1 flex-col justify-center px-5 py-10">
        <div
          className="glass-panel motion-rise w-full p-6"
          style={{ animationDelay: "180ms" }}
        >
          <div className="mb-2 flex items-center gap-2 text-support font-semibold text-white/70">
            {t(online ? "login.subtitle" : "login.unlockOffline")}
          </div>

          <div className="mt-2 motion-fade" style={{ animationDelay: "240ms" }}>
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

          <div className="mt-6 motion-fade" style={{ animationDelay: "300ms" }}>
            <NumberPad value={pin} onChange={setPin} maxLength={6} label={t("login.pin")} id="pin" />
          </div>

          {error ? (
            <div className="mt-3 motion-fade" style={{ animationDelay: "360ms" }}>
              <Alert tone="danger" role="alert" title={error} />
            </div>
          ) : null}

          <div className="mt-6 motion-rise" style={{ animationDelay: "420ms" }}>
            <BigButton
              disabled={!workerId.trim() || pin.length < 4 || pin.length > 6 || busy}
              onClick={() => void submit()}
            >
              {busy ? t("common.loading") : t("login.submit")}
            </BigButton>
          </div>
          {busy && slowLogin ? (
            <div className="mt-3 motion-fade" style={{ animationDelay: "480ms" }}>
              <WakeNotice />
            </div>
          ) : null}

          {!isInstalled && (isIos || installEvt) && (
            <div className="mt-4 motion-rise" style={{ animationDelay: "540ms" }}>
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
            <div className="mt-4 motion-fade flex items-center justify-center gap-2 text-support text-white/70" style={{ animationDelay: "540ms" }}>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Download className="size-3 text-neem-300" aria-hidden="true" />
              </span>
              <span className="text-body font-medium">{t("login.installed")}</span>
            </div>
          )}

          <Sheet
            open={showIosSheet}
            onClose={() => setShowIosSheet(false)}
            ariaLabel={t("login.installIosTitle")}
            describedBy="ios-install-instructions"
          >
            <div className="flex flex-col items-center gap-4 text-center">
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
    </VantagePageShell>
  );
}