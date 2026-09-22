import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, Bell, X, Plus, CalendarClock } from "lucide-react";
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
import { PageShell } from "../components/PageShell";
import { BigButton } from "../components/BigButton";
import { ConditionBadge } from "../components/ConditionBadge";
import { RiskBanner } from "../components/RiskBanner";
import { EmptyState } from "../components/EmptyState";
import { getPatient, getVisitsForPatient } from "../db/repo";
import { lastRisk, lastVisit } from "../lib/records";
import { formatDate, formatTime } from "../lib/dates";
import type { Patient, Visit } from "../types";

export default function PatientDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const p = await getPatient(id);
      setPatient(p ?? null);
      if (p) setVisits(await getVisitsForPatient(id));
      setLoading(false);
    })();
  }, [id]);

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
      <PageShell>
        <p role="status" className="mt-10 text-center text-body text-neem-dark">
          {t("common.loading")}
        </p>
      </PageShell>
    );
  if (!patient) return <PageShell><EmptyState icon={X} title={t("patients.emptyTitle")} /></PageShell>;

  const last = lastVisit(visits, patient.id);
  const riskLevel = lastRisk(visits, patient.id) ?? "home";

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-page font-extrabold text-ink">{patient.name}</h1>
        <button className="btn-ghost min-h-[48px] px-3" onClick={() => navigate(-1)} aria-label={t("common.back")}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <p className="text-body text-neem-dark">
        {patient.age}, {patient.village}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <ConditionBadge condition={patient.condition} />
      </div>

      {patient.next_visit_date && (
        <p className="mt-3 flex items-center gap-1.5 text-body font-semibold text-neem-dark">
          <CalendarClock className="size-5" aria-hidden="true" />
          {t("detail.nextVisit", { date: formatDate(patient.next_visit_date, i18n.language === "hi" ? "hi" : "en") })}
        </p>
      )}

      {last ? (
        <div className="mt-4">
          <RiskBanner level={riskLevel} reasonKeys={last.reason_codes.map((c) => `reason.${c}` as const)} />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigButton variant="primary" icon={Plus} onClick={() => navigate(`/visits/${patient.id}/new`)}>
          {t("detail.logVisit")}
        </BigButton>
        <BigButton variant="secondary" icon={Bell} onClick={() => navigate(`/reminders/${patient.id}`)}>
          {t("detail.sendReminder")}
        </BigButton>
      </div>

      {showBp && bpData.length > 0 && (
        <section className="card mt-6">
          <h2 className="text-section font-extrabold">{t("detail.trendTitle")}</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#DDE9E2" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[40, 220]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={140} label="140" stroke="#E08A00" strokeDasharray="4 4" />
                <ReferenceLine y={90} label="90" stroke="#E08A00" strokeDasharray="4 4" />
                <ReferenceLine y={180} label="180" stroke="#C62828" strokeDasharray="4 4" />
                <ReferenceLine y={120} label="120" stroke="#C62828" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sys" name={`${t("detail.bp")} sys`} stroke="#1D6A50" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="dia" name={`${t("detail.bp")} dia`} stroke="#10231C" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {showSugar && sugarData.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-section font-extrabold">{t("detail.sugarTrendTitle")}</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sugarData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#DDE9E2" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[40, 400]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={126} label="126" stroke="#E08A00" strokeDasharray="4 4" />
                <ReferenceLine y={200} label="200" stroke="#E08A00" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sugar" name={t("detail.sugar")} stroke="#1D6A50" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-section font-extrabold">{t("detail.visitsTitle")}</h2>
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
              .map((v) => (
                <div key={v.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-body font-extrabold">
                      {formatDate(v.visited_at, i18n.language === "hi" ? "hi" : "en")}{" "}
                      <span className="text-base font-normal text-neem-dark">
                        {formatTime(v.visited_at, i18n.language === "hi" ? "hi" : "en")}
                      </span>
                    </p>
                    <span
                      className={`tag ${
                        v.risk_level === "urgent"
                          ? "bg-urgent text-white"
                          : v.risk_level === "clinic"
                            ? "bg-clinic text-ink"
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
                    <p className="mt-1 text-base text-neem-dark">
                      {v.symptoms.map((s) => t(`symptom.${s}`)).join(", ")}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      </section>
    </PageShell>
  );
}