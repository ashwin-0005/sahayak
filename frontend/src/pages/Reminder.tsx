import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, FolderSearch, MessageCircle, Smartphone, X } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { EmptyState } from "../components/EmptyState";
import { Toast } from "../components/Toast";
import { getPatient, getVisitsForPatient } from "../db/repo";
import { formatDate } from "../lib/dates";
import { lastRisk } from "../lib/records";
import type { Language, Patient, RiskLevel, Visit } from "../types";

const ADVICE_KEY: Record<RiskLevel, string> = {
  urgent: "instructionUrgent",
  clinic: "instructionClinic",
  home: "instructionHome"
};

export default function ReminderPage() {
  const { t, i18n } = useTranslation();
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [lang, setLang] = useState<Language>("hi");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getPatient(patientId);
      setPatient(p ?? null);
      if (p) {
        setLang(p.language);
        setVisits(await getVisitsForPatient(p.id));
      }
      setLoaded(true);
    })();
  }, [patientId]);

  const riskLevel: RiskLevel = lastRisk(visits, patientId) ?? "home";

  const built = useMemo(() => {
    if (!patient) return "";
    const lng: Language = lang;
    const parts = [
      i18n.t("reminder.greet", { lng, name: patient.name }),
      i18n.t(`risk.${ADVICE_KEY[riskLevel]}`, { lng }),
      patient.next_visit_date
        ? i18n.t("reminder.nextVisitLine", { lng, date: formatDate(patient.next_visit_date, lng) })
        : i18n.t("reminder.noNextDate", { lng })
    ];
    return parts.join(" ");
  }, [patient, lang, riskLevel, i18n]);

  useEffect(() => {
    setMessage(built);
  }, [built]);

  if (!loaded) {
    return (
      <PageShell>
        <p role="status" className="mt-10 text-center text-body text-neem-dark">
          {t("common.loading")}
        </p>
      </PageShell>
    );
  }

  if (!patient) {
    return (
      <PageShell>
        <EmptyState
          icon={FolderSearch}
          title={t("patients.emptyTitle")}
          actionLabel={t("common.back")}
          onAction={() => navigate(-1)}
        />
      </PageShell>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setToast(true);
  };

  // WhatsApp/SMS addressing needs digits only — a stored "+91 98765 00000"
  // would otherwise produce a dead link (backend strips the same way).
  const phoneDigits = (patient?.phone ?? "").replace(/\D/g, "");

  const shareWa = () =>
    window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");

  const shareSms = () => {
    window.location.href = `sms:${phoneDigits}?body=${encodeURIComponent(message)}`;
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-page font-extrabold">{t("reminder.title")}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <p className="text-body font-bold text-neem-dark">{patient.name}</p>

      <div className="mt-4">
        <span className="text-body font-bold text-ink">{t("reminder.language")}</span>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {(["en", "hi"] as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`min-h-[56px] rounded-button text-body font-bold ${
                lang === l ? "bg-neem text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {l === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="msg" className="text-body font-bold text-ink">
          {t("reminder.messageLabel")}
        </label>
        <textarea
          id="msg"
          rows={6}
          className="mt-1 w-full rounded-button border border-mist bg-white px-4 py-3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {!patient.phone ? (
        <p role="alert" className="mt-3 text-body font-bold text-urgent">
          {t("reminder.noPhone")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <BigButton variant="secondary" icon={Copy} onClick={() => void copy()}>
          {t("reminder.copy")}
        </BigButton>
        <BigButton icon={MessageCircle} disabled={!patient.phone} onClick={shareWa}>
          {t("reminder.sendWhatsApp")}
        </BigButton>
        <BigButton variant="secondary" icon={Smartphone} disabled={!patient.phone} onClick={shareSms}>
          {t("reminder.sendSms")}
        </BigButton>
      </div>

      <p className="mt-4 text-base text-neem-dark">{t("settings.disclaimer")}</p>

      {toast ? <Toast message={t("reminder.copied")} onDone={() => setToast(false)} /> : null}
    </PageShell>
  );
}
