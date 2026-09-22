import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Download, Lock, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { SyncStatus } from "../components/SyncStatus";
import { Sheet } from "../components/Sheet";
import { getSession, lockApp, deleteSession } from "../auth/auth";
import { clearQuarantine, discardQuarantine, getAllPatients, getPatient, getQuarantine, resetLocalData } from "../db/repo";
import { setLanguage, type UILang } from "../i18n";
import type { Session } from "../auth/auth";
import type { QuarantineEntry } from "../types";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [ready, setReady] = useState(false);
  const [quarantine, setQuarantine] = useState<QuarantineEntry[]>([]);
  const [quarantineNames, setQuarantineNames] = useState<Record<number, string>>({});

  const reloadQuarantine = async (): Promise<void> => {
    const rows = await getQuarantine();
    setQuarantine(rows);
    const names: Record<number, string> = {};
    for (const q of rows) {
      if (q.id === undefined) continue;
      const rec = (q.record ?? {}) as { name?: unknown; id?: unknown; patient_id?: unknown };
      if (typeof rec.name === "string" && rec.name) {
        names[q.id] = rec.name;
      } else if (typeof rec.patient_id === "string") {
        const p = await getPatient(rec.patient_id);
        names[q.id] = p ? p.name : String(rec.id ?? rec.patient_id);
      } else {
        names[q.id] = String(rec.id ?? q.code);
      }
    }
    setQuarantineNames(names);
  };

  useEffect(() => {
    void (async () => {
      setSession(await getSession());
      setPatientCount((await getAllPatients()).length);
      await reloadQuarantine();
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
              aria-pressed={lang === l}
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

      {quarantine.length > 0 ? (
        <section aria-label={t("settings.syncIssuesTitle")} className="mt-4 card rail-urgent">
          <p className="flex items-center gap-2 text-body font-bold text-ink">
            <AlertTriangle className="size-5 text-urgent" aria-hidden="true" />
            {t("settings.syncIssuesTitle")}
          </p>
          <p className="mt-1 text-base text-neem-dark">
            {quarantine.length === 1
              ? t("settings.syncIssuesBodyOne")
              : t("settings.syncIssuesBody", { count: quarantine.length })}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {quarantine.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-button bg-mist px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-body font-bold text-ink">
                    {q.id !== undefined ? quarantineNames[q.id] ?? q.code : q.code}
                  </p>
                  <p className="text-base text-neem-dark">
                    {q.code} · {q.message}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-[48px] shrink-0 px-3 text-body font-bold text-urgent"
                  onClick={() => void (q.id !== undefined ? discardQuarantine(q.id).then(() => void reloadQuarantine()) : Promise.resolve())}
                >
                  {t("settings.discard")}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 min-h-[48px] w-full rounded-button bg-mist text-body font-bold text-neem-dark"
            onClick={() => void clearQuarantine().then(() => void reloadQuarantine())}
          >
            {t("settings.discardAll")}
          </button>
        </section>
      ) : null}

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
        <Sheet
          open={confirming}
          onClose={() => setConfirming(false)}
          role="alertdialog"
          ariaLabel={t("settings.resetConfirmTitle")}
          describedBy="reset-confirm-body"
        >
          <p className="text-section font-extrabold text-urgent">{t("settings.resetConfirmTitle")}</p>
          <p id="reset-confirm-body" className="mt-2 text-body text-ink">{t("settings.resetConfirmBody")}</p>
          <div className="mt-5 flex flex-col gap-3">
            <BigButton variant="danger" icon={RotateCcw} onClick={() => void doReset()}>
              {t("settings.resetConfirmYes")}
            </BigButton>
            <BigButton variant="secondary" dataAutofocus onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </BigButton>
          </div>
        </Sheet>
      )}
    </PageShell>
  );
}