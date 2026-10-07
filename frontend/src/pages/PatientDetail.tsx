import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, Bell, X, Plus, CalendarClock, Share2, Copy, MessageCircle } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { VantagePageShell } from "../components/VantagePageShell";
import { BigButton } from "../components/BigButton";
import { ConditionBadge } from "../components/ConditionBadge";
import { RiskBanner } from "../components/RiskBanner";
import { EmptyState } from "../components/EmptyState";
import { Sheet } from "../components/Sheet";
import { Toast } from "../components/Toast";
import { getPatient, getVisitsForPatient } from "../db/repo";
import { lastRisk, lastVisit } from "../lib/records";
import { buildPatientSummary } from "../lib/summary";
import { formatDate, formatTime } from "../lib/dates";
import { colorToken } from "../theme/tokens";
import type { Patient, Visit } from "../types";

export default function PatientDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getPatient(id);
      setPatient(p ?? null);
      if (p) setVisits(await getVisitsForPatient(id));
      setLoading(false);
    })();
  }, [id]);

  const openShareSheet = () => {
    const lng = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";
    const summary = buildPatientSummary(patient!, visits, lng);
    setSummaryText(summary);
    setShareSheetOpen(true);
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summaryText);
    setToast(true);
  };

  const shareViaWhatsApp = () => {
    if (!patient?.phone) return;
    const digits = patient.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(summaryText)}`, "_blank", "noopener");
  };

  const showBp = patient?.condition === "hypertension" || patient?.condition === "pregnancy";
  const showSugar = patient?.condition === "diabetes";

  const bpData = useMemo(
    () =>
      visits
        .filter((v) => v.systolic != null && v.diastolic != null)
        .map((v) => ({
          label: formatDate(v.visited_at, i18n.language === "hi" ? "hi" : "en"),
          sys: v.systolic as number,
          dia: v.diastolic as number
        }))
        .slice(-12),
    [visits, i18n.language]
  );

  const sugarData = useMemo(
    () =>
      visits
        .filter((v) => v.sugar_mg_dl != null)
        .map((v) => ({
          label: formatDate(v.visited_at, i18n.language === "hi" ? "hi" : "en"),
          sugar: v.sugar_mg_dl as number
        }))
        .slice(-12),
    [visits, i18n.language]
  );

  if (loading)
    return (
      <VantagePageShell>
        <p role="status" className="mt-10 text-center text-body text-white/70 motion-fade" style={{ animationDelay: "180ms" }}>
          {t("common.loading")}
        </p>
      </VantagePageShell>
    );
  if (!patient) return <VantagePageShell><EmptyState icon={X} title={t("patients.emptyTitle")} /></VantagePageShell>;

  const last = lastVisit(visits, patient.id);
  const riskLevel = lastRisk(visits, patient.id) ?? "home";

  return (
    <VantagePageShell>
      <div className="motion-fade flex items-center justify-between" style={{ animationDelay: "180ms" }}>
        <h1 className="text-page font-extrabold text-white">{patient.name}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <p className="motion-fade text-body text-white/70" style={{ animationDelay: "220ms" }}>
        {patient.age}, {patient.village}
      </p>
      <div className="mt-2 motion-fade flex items-center gap-2" style={{ animationDelay: "260ms" }}>
        <ConditionBadge condition={patient.condition} />
      </div>

      {patient.next_visit_date && (
        <p className="mt-3 motion-fade flex items-center gap-1.5 text-body font-semibold text-white/70" style={{ animationDelay: "300ms" }}>
          <CalendarClock className="size-5" aria-hidden="true" />
          {t("detail.nextVisit", { date: formatDate(patient.next_visit_date, i18n.language === "hi" ? "hi" : "en") })}
        </p>
      )}

      {last ? (
        <div className="mt-4 motion-rise" style={{ animationDelay: "340ms" }}>
          <RiskBanner level={riskLevel} reasonKeys={last.reason_codes.map((c) => `reason.${c}` as const)} />
        </div>
      ) : null}

      <div className="mt-5 motion-rise grid grid-cols-3 gap-3" style={{ animationDelay: "380ms" }}>
        <BigButton variant="primary" icon={Plus} onClick={() => navigate(`/visits/${patient.id}/new`)}>
          {t("detail.logVisit")}
        </BigButton>
        <BigButton variant="secondary" icon={Bell} onClick={() => navigate(`/reminders/${patient.id}`)}>
          {t("detail.sendReminder")}
        </BigButton>
        <BigButton variant="secondary" icon={Share2} onClick={openShareSheet}>
          {t("detail.shareSummary")}
        </BigButton>
      </div>

      {showBp && bpData.length > 0 && (
        <section className="card mt-6 motion-rise" style={{ animationDelay: "440ms" }}>
          <h2 className="text-section font-extrabold text-ink">{t("detail.trendTitle")}</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke={colorToken.mist} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[40, 220]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={140} label="140" stroke={colorToken.warning} strokeDasharray="4 4" />
                <ReferenceLine y={90} label="90" stroke={colorToken.warning} strokeDasharray="4 4" />
                <ReferenceLine y={180} label="180" stroke={colorToken.urgent} strokeDasharray="4 4" />
                <ReferenceLine y={120} label="120" stroke={colorToken.urgent} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sys" name={`${t("detail.bp")} sys`} stroke={colorToken.neem} strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="dia" name={`${t("detail.bp")} dia`} stroke={colorToken.ink} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {showSugar && sugarData.length > 0 && (
        <section className="card mt-4 motion-rise" style={{ animationDelay: "500ms" }}>
          <h2 className="text-section font-extrabold text-ink">{t("detail.sugarTrendTitle")}</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sugarData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke={colorToken.mist} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[40, 400]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={126} label="126" stroke={colorToken.warning} strokeDasharray="4 4" />
                <ReferenceLine y={200} label="200" stroke={colorToken.warning} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sugar" name={t("detail.sugar")} stroke={colorToken.neem} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mt-6 motion-fade" style={{ animationDelay: "560ms" }}>
        <h2 className="text-section font-extrabold text-white">{t("detail.visitsTitle")}</h2>
        {visits.length > 50 ? (
          <p role="status" className="mt-1 text-support text-white/70">
            {t("detail.showingRecent", { count: 50, total: visits.length })}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-3">
          {visits.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title={t("detail.noVisits")}
              body={t("detail.noVisitsBody")}
              actionLabel={t("detail.logVisit")}
              onAction={() => navigate(`/visits/${patient.id}/new`)}
            />
          ) : (
            [...visits]
              .sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1))
              .slice(0, 50)
              .map((v) => (
                <div key={v.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-body font-extrabold text-ink">
                      {formatDate(v.visited_at, i18n.language === "hi" ? "hi" : "en")}{" "}
                      <span className="text-support font-normal text-neem-dark">
                        {formatTime(v.visited_at, i18n.language === "hi" ? "hi" : "en")}
                      </span>
                    </p>
                    <span
                      className={`tag ${
                        v.risk_level === "urgent"
                          ? "bg-urgent text-white"
                          : v.risk_level === "clinic"
                            ? "bg-clinic text-white"
                            : "bg-home text-white"
                      }`}
                    >
                      {t(`risk.${v.risk_level}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-body text-ink">
                    {v.systolic != null && v.diastolic != null
                      ? `${t("detail.bp")}: ${v.systolic}/${v.diastolic}`
                      : null}
                    {v.sugar_mg_dl != null
                      ? ` · ${t("detail.sugar")}: ${v.sugar_mg_dl}${v.sugar_type ? ` (${t(`visit.${v.sugar_type}`)})` : ""}`
                      : null}
                    {v.missed_doses > 0 ? ` · ${t("visit.missedDoses")}: ${v.missed_doses}` : null}
                  </p>
                  {v.symptoms.length > 0 && (
                    <p className="mt-1 text-support text-neem-dark">
                      {v.symptoms.map((s) => t(`symptom.${s}`)).join(", ")}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      </section>

      <Sheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        ariaLabel={t("detail.shareSummary")}
        describedBy="summary-text"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-section font-extrabold text-ink">{t("detail.shareSummary")}</h2>
        </div>
        <textarea
          id="summary-text"
          rows={10}
          readOnly
          className="w-full rounded-button border border-mist bg-white px-4 py-3 text-body font-mukta"
          value={summaryText}
        />
        <div className="mt-4 flex flex-col gap-3">
          <BigButton icon={Copy} onClick={copySummary}>
            {t("detail.copyClipboard")}
          </BigButton>
          <BigButton icon={MessageCircle} disabled={!patient?.phone} onClick={shareViaWhatsApp}>
            {t("detail.shareWhatsApp")}
          </BigButton>
        </div>
        {!patient?.phone && (
          <p className="mt-3 text-support text-neem-dark">{t("reminder.noPhone")}</p>
        )}
      </Sheet>

      {toast ? (
        <Toast message={t("detail.copied")} onDone={() => setToast(false)} />
      ) : null}
    </VantagePageShell>
  );
}