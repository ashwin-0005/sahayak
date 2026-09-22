import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Volume2 } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { RISK_META } from "../lib/riskMeta";
import { formatDate } from "../lib/dates";
import { hasVoiceFor, speak } from "../voice/speak";
import type { Patient, Visit } from "../types";

interface ResultState {
  patient: Patient;
  visit: Visit;
}

export default function RiskResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultState | null;

  useEffect(() => {
    if (!state) return;
    const { patient, visit } = state;
    if (visit.risk_level === "urgent" || visit.risk_level === "clinic") {
      const lng = patient.language;
      const summary = `${t(`risk.${visit.risk_level}`, { lng, defaultValue: "Risk" })} — ${t(
        `risk.${ADVICE_KEY[visit.advice_key]}`,
        { lng }
      )}. ${visit.reason_codes.map((c) => t(`reason.${c}`, { lng })).join(". ")}. ${patient.name}`;
      speak(summary, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(state)]);

  if (!state) {
    return (
      <PageShell>
        <p className="mt-10 text-center text-body text-neem-dark">{t("risk.summary")}</p>
        <BigButton className="mt-4" onClick={() => navigate("/")}>
          {t("common.done")}
        </BigButton>
      </PageShell>
    );
  }

  const { patient, visit } = state;
  const meta = RISK_META[visit.risk_level];
  const Icon = meta.icon;
  const lng = patient.language;
  const reads = [
    visit.systolic != null && visit.diastolic != null ? `${t("detail.bp")} ${visit.systolic}/${visit.diastolic}` : null,
    visit.sugar_mg_dl != null ? `${t("detail.sugar")} ${visit.sugar_mg_dl}` : null
  ].filter(Boolean);

  const speakOut = () => {
    const summary = [...reads, `${t(`risk.${visit.risk_level}`, { lng })}. ${t(`risk.${ADVICE_KEY[visit.advice_key]}`, { lng })}`].join(". ");
    speak(summary, lng);
  };

  const ADVICE_KEY = { refer_urgent: "instructionUrgent", visit_clinic_week: "instructionClinic", continue_home_care: "instructionHome" } as const;

  return (
    <PageShell noNav>
      <div className="relative overflow-hidden rounded-card p-6 text-white" style={{ backgroundColor: meta.bg }}>
        <Icon className="absolute -right-4 -top-4 size-28 opacity-20" aria-hidden="true" />
        <p className="text-base font-semibold uppercase tracking-wide">{t("risk.summary")}</p>
        <p className="mt-1 text-5xl font-extrabold">{t(`risk.${visit.risk_level}`)}</p>
        <p className="mt-2 text-body">{patient.name}</p>
        {reads.length > 0 && <p className="mt-1 text-base opacity-90">{reads.join(" · ")}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {visit.reason_codes.map((c) => (
          <p key={c} className="flex items-start gap-2 text-body text-ink">
            <span className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
            {t(`reason.${c}`)}
          </p>
        ))}
      </div>

      <div className="card mt-4">
        <p className="text-section font-extrabold">{t(`risk.${ADVICE_KEY[visit.advice_key]}`)}</p>
        <p className="mt-2 text-body text-neem-dark">
          {t("risk.nextVisit")}: {patient.next_visit_date ? formatDate(patient.next_visit_date, lng) : "—"}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {hasVoiceFor(lng) ? (
          <BigButton variant="secondary" icon={Volume2} onClick={speakOut}>
            {t("risk.listen")}
          </BigButton>
        ) : (
          <p className="text-base text-neem-dark">{t("risk.listenMissing")}</p>
        )}
        <BigButton icon={Bell} onClick={() => navigate(`/reminders/${patient.id}`)}>
          {t("risk.sendReminder")}
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate("/")}>
          {t("risk.done")}
        </BigButton>
      </div>
    </PageShell>
  );
}