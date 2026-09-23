import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, CalendarClock, ChartNoAxesColumn, CircleHelp, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/EmptyState";
import { SummaryCardSkeleton } from "../components/Skeleton";
import { getAllPatients, getAllVisits } from "../db/repo";
import { summarize, visitsByWeek } from "../lib/insights";
import { formatNumber, todayUTC } from "../lib/dates";
import { RISK_META } from "../lib/riskMeta";
import { colorToken } from "../theme/tokens";
import type { Patient, RiskLevel, Visit } from "../types";

const WEEKS = 7;

interface Tile {
  icon: LucideIcon;
  labelKey: string;
  value: number;
}

function compactDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short"
  }).format(d);
}

export default function InsightsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lng = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";
  const today = todayUTC();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      setPatients(await getAllPatients());
      setVisits(await getAllVisits());
      setLoaded(true);
    })();
  }, []);

  const stats = useMemo(() => summarize(patients, visits, today), [patients, visits, today]);
  const weeks = useMemo(() => visitsByWeek(visits, today, WEEKS), [visits, today]);
  const chartData = useMemo(
    () => weeks.map((w) => ({ label: compactDate(w.label, lng), visits: w.count })),
    [weeks, lng]
  );

  const tiles: Tile[] = [
    { icon: Users, labelKey: "insights.patients", value: stats.totalPatients },
    { icon: MapPin, labelKey: "insights.villages", value: stats.villages },
    { icon: CalendarClock, labelKey: "insights.dueNow", value: stats.dueNow },
    { icon: CalendarCheck, labelKey: "insights.visits7", value: stats.visitsLast7 }
  ];

  // Risk rows are clinical: risk colours are reserved for them, and each row
  // carries icon + label + count, never colour alone.
  const riskRows: RiskLevel[] = ["urgent", "clinic", "home"];

  return (
    <PageShell>
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-page font-extrabold text-ink">{t("insights.title")}</h1>
          <p className="text-body text-neem-dark">{t("insights.subtitle")}</p>
        </div>
        <ChartNoAxesColumn className="size-9 shrink-0 text-neem" aria-hidden="true" />
      </header>

      {!loaded ? (
        <div className="mt-section grid grid-cols-2 gap-card" aria-hidden="true">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : stats.totalPatients === 0 ? (
        <div className="mt-section">
          <EmptyState
            icon={ChartNoAxesColumn}
            title={t("insights.emptyTitle")}
            body={t("insights.emptyBody")}
            actionLabel={t("home.addFollowUp")}
            onAction={() => navigate("/patients/new")}
          />
        </div>
      ) : (
        <>
          <div className="mt-section grid grid-cols-2 gap-card">
            {tiles.map(({ icon: Icon, labelKey, value }) => (
              <div key={labelKey} className="card flex flex-col items-center gap-1 text-center">
                <Icon className="size-5 text-neem" aria-hidden="true" />
                <p className="text-display font-extrabold leading-none tabular-nums">{formatNumber(value, lng)}</p>
                <p className="text-support text-neem-dark">{t(labelKey)}</p>
              </div>
            ))}
          </div>

          <section className="card mt-section" aria-label={t("insights.visitsPerWeek")}>
            <h2 className="text-section font-extrabold text-ink">{t("insights.visitsPerWeek")}</h2>
            <p className="mt-0.5 text-support text-neem-dark">{t("insights.weekRange", { n: WEEKS })}</p>
            <div className="mt-2 h-56" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
                  <CartesianGrid stroke={colorToken.mist} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="visits" name={t("insights.visitsLabel")} fill={colorToken.neem} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card mt-section" aria-label={t("insights.riskTitle")}>
            <h2 className="text-section font-extrabold text-ink">{t("insights.riskTitle")}</h2>
            <p className="mt-0.5 text-support text-neem-dark">{t("insights.riskSummary")}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {riskRows.map((level) => {
                const meta = RISK_META[level];
                const Icon = meta.icon;
                return (
                  <li key={level} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-body font-semibold text-ink">
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="size-3.5 text-white" aria-hidden="true" />
                      </span>
                      {t(`risk.${level}`)}
                    </span>
                    <span className="text-body font-extrabold tabular-nums">{formatNumber(stats.health[level], lng)}</span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between gap-3 border-t border-mist pt-3">
                <span className="flex items-center gap-2.5 text-body font-semibold text-neem-dark">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist">
                    <CircleHelp className="size-3.5 text-neem-dark" aria-hidden="true" />
                  </span>
                  {t("insights.unassessed")}
                </span>
                <span className="text-body font-extrabold tabular-nums">{formatNumber(stats.health.unassessed, lng)}</span>
              </li>
            </ul>
          </section>
        </>
      )}
    </PageShell>
  );
}