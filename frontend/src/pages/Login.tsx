import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { loginOnline, unlockOffline } from "../auth/auth";
import { NumberPad } from "../components/NumberPad";
import { BigButton } from "../components/BigButton";
import { Field } from "../components/Field";
import { Alert } from "../components/Alert";
import { ToggleGroup } from "../components/ToggleGroup";
import { setLanguage } from "../i18n";
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
          <ToggleGroup
            pill
            label={t("login.languageLabel")}
            value={lang}
            onChange={(v) => setLanguage(v)}
            options={[
              { value: "en", label: "English" },
              { value: "hi", label: "हिन्दी" }
            ]}
          />
        </div>

        <div className="mt-10 flex flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 text-base font-semibold text-neem-dark">
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
            <NumberPad value={pin} onChange={setPin} maxLength={4} label={t("login.pin")} id="pin" />
          </div>

          {error ? <Alert tone="danger" role="alert" title={error} className="mt-3" /> : null}

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