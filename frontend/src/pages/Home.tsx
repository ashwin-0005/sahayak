import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, HeartPulse, Hourglass, Siren, UserRound } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { SyncStatus } from "../components/SyncStatus";
import { PatientCard } from "../components/PatientCard";
import { EmptyState } from "../components/EmptyState";
import { getSession } from "../auth/auth";
import { getAllPatients, getVisitsForPatient } from "../db/repo";
import { dueNow, lastRisk, overdueDays } from "../lib/records";
import type { Patient, Visit } from "../types";
import { isSameDay, todayUTC } from "../lib/dates";
import { useNavigate } from "react-router-dom";
import type { Session } from "../auth/auth";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    void getSession().then(setSession);
    void load();
  }, []);

  async function load() {
    const ps = await getAllPatients();
    setPatients(ps);
    const vs: Visit[] = [];
    for (const p of ps) {
      vs.push(...(await getVisitsForPatient(p.id)));
    }
    setVisits(vs);
  }

  const due = useMemo(() => dueNow(patients, visits), [patients, visits]);

  const counts = useMemo(() => {
    const urgent = patients.filter((p) => lastRisk(visits, p.id) === "urgent").length;
    const overdue = patients.filter((p) => (overdueDays(p) ?? 0) > 0).length;
    const today = visits.filter((v) => isSameDay(v.visited_at)).length;
    return { urgent, overdue, today };
  }, [patients, visits]);

  const summary = [
    { label: t("home.urgentCount"), value: counts.urgent, icon: Siren, color: "#C62828" },
    { label: t("home.overdueCount"), value: counts.overdue, icon: Hourglass, color: "#E08A00" },
    { label: t("home.visitsTodayCount"), value: counts.today, icon: HeartPulse, color: "#1D6A50" }
  ];

  return (
    <PageShell>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-page font-extrabold text-ink">
            {t("home.greeting", { name: session?.worker.name ?? "" })}
          </h1>
          <p className="text-body text-neem-dark">{todayUTC()}</p>
        </div>
        <UserRound className="size-9 text-neem" aria-hidden="true" />
      </header>

      <div className="mt-4">
        <SyncStatus onSynced={() => void load()} />
      </div>

      <section className="mt-5 grid grid-cols-3 gap-3" aria-label="Summary">
        {summary.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex flex-col items-center gap-1 text-center">
            <Icon className="size-6" style={{ color }} aria-hidden="true" />
            <span className="text-4xl font-extrabold tabular-nums text-ink">{value}</span>
            <span className="text-base font-semibold text-neem-dark">{label}</span>
          </div>
        ))}
      </section>

      <section className="mt-6" aria-label={t("home.dueListTitle")}>
        <h2 className="text-section font-extrabold">{t("home.dueListTitle")}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {due.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title={t("home.emptyTitle")}
              body={t("home.emptyBody")}
              actionLabel={t("home.emptyAction")}
              onAction={() => navigate("/patients/new")}
            />
          ) : (
            due.slice(0, 50).map((p) => (
              <PatientCard key={p.id} patient={p} lastRiskLevel={lastRisk(visits, p.id)} />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}