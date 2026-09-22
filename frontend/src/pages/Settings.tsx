import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Download, Lock, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { SyncStatus } from "../components/SyncStatus";
import { getSession, lockApp, deleteSession } from "../auth/auth";
import { getAllPatients, resetLocalData } from "../db/repo";
import { setLanguage, type UILang } from "../i18n";
import type { Session } from "../auth/auth";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      setSession(await getSession());
      setPatientCount((await getAllPatients()).length);
      setReady(true);
    })();
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  const lang = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";

  const doReset = async () => {
    await resetLocalData();
    setConfirming(false);
    window.location.reload();
  };

  const doInstall = () => {
    if (!installEvt) return;
    (installEvt as unknown as { prompt: () => void }).prompt();
  };

  if (!ready) {
    return (
      <PageShell>
        <p role="status" className="mt-10 text-center text-body text-neem-dark">
          {t("common.loading")}
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-page font-extrabold">{t("settings.title")}</h1>

      <div className="mt-4">
        <SyncStatus />
      </div>

      <p className="mt-4 text-body text-neem-dark">
        {session?.worker.name} · {session?.workerId}
      </p>

      <div className="mt-4">
        <span className="text-body font-bold text-ink">{t("settings.language")}</span>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {(["en", "hi"] as UILang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`min-h-[56px] rounded-button text-body font-bold ${
                lang === l ? "bg-neem text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {l === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 card">
        <p className="text-body font-bold text-ink">{t("settings.about")}</p>
        <p className="mt-1 text-base text-neem-dark">
          {t("app.name")} · {t("settings.patientCount", { count: patientCount })}
        </p>
        <p className="mt-3 flex items-start gap-2 text-base text-neem-dark">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-neem" aria-hidden="true" />
          {t("settings.disclaimer")}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {installEvt ? (
          <BigButton variant="secondary" icon={Download} onClick={doInstall}>
            {t("settings.install")}
          </BigButton>
        ) : null}
        <BigButton variant="secondary" icon={Lock} onClick={() => void lockApp().then(() => navigate("/login"))}>
          {t("settings.lock")}
        </BigButton>
        <BigButton variant="secondary" icon={Trash2} onClick={() => setConfirming(true)}>
          {t("settings.reset")}
        </BigButton>
        <BigButton variant="danger" icon={Lock} onClick={() => void deleteSession().then(() => navigate("/login"))}>
          {t("settings.logOut")}
        </BigButton>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50" role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t("settings.resetConfirmTitle")}
            className="w-full max-w-[480px] rounded-t-card bg-paper p-5 shadow-sheet animate-sheet-up"
          >
            <p className="text-section font-extrabold text-urgent">{t("settings.resetConfirmTitle")}</p>
            <p className="mt-2 text-body text-ink">{t("settings.resetConfirmBody")}</p>
            <div className="mt-5 flex flex-col gap-3">
              <BigButton variant="danger" icon={RotateCcw} onClick={() => void doReset()}>
                {t("settings.resetConfirmYes")}
              </BigButton>
              <BigButton variant="secondary" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}