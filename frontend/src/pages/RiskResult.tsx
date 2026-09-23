import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, HeartPulse, Volume2 } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { EmptyState } from "../components/EmptyState";
import { RISK_META } from "../lib/riskMeta";
import { formatDate } from "../lib/dates";
import { hasVoiceFor, speak } from "../voice/speak";
import { getMeta } from "../db/repo";
import type { Patient, Visit } from "../types";

interface ResultState {
  patient: Patient;
  visit: Visit;
}

const ADVICE_KEY = { refer_urgent: "instructionUrgent", visit_clinic_week: "instructionClinic", continue_home_care: "instructionHome" } as const;

const LAST_RESULT_KEY = "lastRiskResult";

export default function RiskResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as ResultState | null;
  const [stored, setStored] = useState<ResultState | null>(null);
  const [checking, setChecking] = useState(!navState);

  // Survive a refresh: VisitNew persists every result; fall back to it when
  // there is no navigation state (refresh, shared link, back-button).
  useEffect(() => {
    if (navState) return;
    void getMeta(LAST_RESULT_KEY).then((v) => {
      setStored((v as ResultState | null) ?? null);
      setChecking(false);
    });
  }, [navState]);

  const data = navState ?? stored;

  useEffect(() => {
    if (!data) return;
    const { patient, visit } = data;
    if (visit.risk_level === "urgent" || visit.risk_level === "clinic") {
      const lng = patient.language;
      const summary = `${t(`risk.${visit.risk_level}`, { lng, defaultValue: "Risk" })} — ${t(
        `risk.${ADVICE_KEY[visit.advice_key]}`,
        { lng }
      )}. ${visit.reason_codes.map((c) => t(`reason.${c}`, { lng })).join(". ")}. ${patient.name}`;
      speak(summary, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(data)]);

  if (checking) {
    return (
      <PageShell noNav>
        <p role="status" className="mt-10 text-center text-body text-neem-dark">
          {t("common.loading")}
        </p>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell noNav>
        <EmptyState
          icon={HeartPulse}
          title={t("risk.noResult")}
          actionLabel={t("common.done")}
          onAction={() => navigate("/home")}
        />
      </PageShell>
    );
  }

  const { patient, visit } = data;
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

  return (
    <PageShell noNav>
      {/* The one deliberate "moment": the risk color fills the screen with
          its icon centered, then fades to reveal the hero band while the
          message and actions rise in a beat after. Reduced motion collapses
          all of this to the resting layout instantly. */}
      <div className="mv-risk-wash" style={{ backgroundColor: meta.bg }} aria-hidden="true">
        <Icon className="mv-risk-wash-icon size-24 text-white" />
      </div>

      <div className="mv-risk-reveal" style={{ animationDelay: "0.15s" }}>
        <div className="relative overflow-hidden rounded-card p-6 text-white" style={{ backgroundColor: meta.bg }}>
          <Icon className="absolute -right-4 -top-4 size-28 opacity-20" aria-hidden="true" />
          <p className="text-support font-semibold uppercase tracking-wide">{t("risk.summary")}</p>
          <p className="mt-1 text-display font-extrabold">{t(`risk.${visit.risk_level}`)}</p>
          <p className="mt-2 text-body">{patient.name}</p>
          {reads.length > 0 && <p className="mt-1 text-support opacity-90">{reads.join(" · ")}</p>}
        </div>
      </div>

      <div className="mv-risk-reveal mt-4 flex flex-col gap-1.5" style={{ animationDelay: "0.4s" }}>
        {visit.reason_codes.map((c) => (
          <p key={c} className="flex items-start gap-2 text-body text-ink">
            <span className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
            {t(`reason.${c}`)}
          </p>
        ))}
      </div>

      <div className="mv-risk-reveal card mt-4" style={{ animationDelay: "0.52s" }}>
        <p className="text-section font-extrabold">{t(`risk.${ADVICE_KEY[visit.advice_key]}`)}</p>
        <p className="mt-2 text-body text-neem-dark">
          {t("risk.nextVisit")}: {patient.next_visit_date ? formatDate(patient.next_visit_date, lng) : "—"}
        </p>
        <p className="mt-2 text-support text-neem-dark">{t("settings.disclaimer")}</p>
      </div>

      <div className="mv-risk-reveal mt-4 flex flex-col gap-3" style={{ animationDelay: "0.65s" }}>
        {hasVoiceFor(lng) ? (
          <BigButton variant="secondary" icon={Volume2} onClick={speakOut}>
            {t("risk.listen")}
          </BigButton>
        ) : (
          <p className="text-support text-neem-dark">{t("risk.listenMissing")}</p>
        )}
        <BigButton icon={Bell} onClick={() => navigate(`/reminders/${patient.id}`)}>
          {t("risk.sendReminder")}
        </BigButton>
        <BigButton variant="secondary" onClick={() => navigate("/home")}>
          {t("risk.done")}
        </BigButton>
      </div>
    </PageShell>
  );
}
