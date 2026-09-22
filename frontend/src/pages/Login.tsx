import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { loginOnline, unlockOffline } from "../auth/auth";
import { NumberPad } from "../components/NumberPad";
import { BigButton } from "../components/BigButton";
import { setLanguage, type UILang } from "../i18n";
import { syncNow } from "../sync/syncEngine";
import { ApiErrorClass } from "../lib/api";
import { useSlowNotice } from "../lib/useSlow";
import { withRetry } from "../lib/retry";
import { WakeNotice } from "../components/WakeNotice";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
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

  const lang = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";

  const submit = async () => {
    if (!workerId.trim() || pin.length !== 4 || busy) return;
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
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pb-10 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-page font-extrabold text-ink">{t("app.name")}</h1>
          <p className="text-body text-neem-dark">{t("app.tagline")}</p>
        </div>
        <div className="flex gap-1" role="group" aria-label={t("login.languageLabel")}>
          {(["en", "hi"] as UILang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              aria-pressed={lang === l}
              className={`min-h-[48px] rounded-full px-3 py-2 text-base font-bold ${
                lang === l ? "bg-neem text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {l === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold text-neem-dark">
          {t(online ? "login.subtitle" : "login.unlockOffline")}
        </div>

        <label htmlFor="workerId" className="mt-4 block text-body font-bold text-ink">
          {t("login.workerId")}
        </label>
        <input
          id="workerId"
          className="mt-1 min-h-[56px] w-full rounded-button border border-mist bg-white px-4"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          inputMode="text"
          autoCapitalize="none"
          autoComplete="username"
        />

        <div className="mt-6">
          <NumberPad value={pin} onChange={setPin} maxLength={4} label={t("login.pin")} id="pin" />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-body font-bold text-urgent">
            {error}
          </p>
        ) : null}

        <BigButton
          className="mt-6"
          disabled={!workerId.trim() || pin.length !== 4 || busy}
          onClick={() => void submit()}
        >
          {busy ? t("common.loading") : t("login.submit")}
        </BigButton>
        {busy && slowLogin ? (
          <div className="mt-3">
            <WakeNotice />
          </div>
        ) : null}
      </div>
    </div>
  );
}