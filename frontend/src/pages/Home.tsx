import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleHelp,
  CirclePlus,
  CloudUpload,
  Hourglass,
  UserRound,
  Users
} from "lucide-react";
import { PageShell } from "../components/PageShell";
import { SyncStatus } from "../components/SyncStatus";
import { PatientCard } from "../components/PatientCard";
import { FilterTabs, type FilterOption } from "../components/FilterTabs";
import { FollowUpGroup } from "../components/FollowUpGroup";
import { Alert } from "../components/Alert";
import { BigButton } from "../components/BigButton";
import { EmptyState } from "../components/EmptyState";
import { DueListSkeleton, SummaryCardSkeleton } from "../components/Skeleton";
import { getSession } from "../auth/auth";
import { getAllPatients, getAllVisits, getPendingOutbox } from "../db/repo";
import { lastRisk, overdueDays } from "../lib/records";
import { useSync } from "../sync/useSync";
import { RISK_META } from "../lib/riskMeta";
import { colorToken } from "../theme/tokens";
import type { LucideIcon } from "lucide-react";
import type { Patient, RiskLevel, Visit } from "../types";
import { formatDay, formatNumber, todayUTC } from "../lib/dates";
import type { Session } from "../auth/auth";

type FilterKey = "today" | "overdue" | "all" | "needsSync";
type GroupKey = "urgent" | "dueToday" | "overdue" | "upcoming" | "waitingSync";

interface QueueItem {
  patient: Patient;
  risk: RiskLevel | null;
  overdue: number;
}

const MAX_LIST = 30;

// The most urgent action stays pinned on top, then the rest of the queue.
const GROUP_ORDER: GroupKey[] = ["urgent", "dueToday", "overdue", "upcoming", "waitingSync"];

const URGENCY_LEGEND: { risk: RiskLevel; instructKey: string }[] = [
  { risk: "urgent", instructKey: "risk.instructionUrgent" },
  { risk: "clinic", instructKey: "risk.instructionClinic" },
  { risk: "home", instructKey: "risk.instructionHome" }
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lng = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";
  const sync = useSync();

  const [session, setSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingRows, setPendingRows] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void getSession().then(setSession);
    void load();
  }, []);

  // Refresh the "waiting to sync" patient set whenever the outbox size changes
  // (rows are acked and removed after each successful sync).
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await getPendingOutbox();
      const ids = new Set<string>();
      for (const row of rows) {
        try {
          const rec = JSON.parse(row.record) as { id?: string; patient_id?: string };
          if (row.table === "patients" && rec.id) ids.add(rec.id);
          else if (row.table === "visits" && rec.patient_id) ids.add(rec.patient_id);
        } catch {
          // Corrupt outbox rows are quarantined by the sync engine.
        }
      }
      if (alive) {
        setPendingIds(ids);
        setPendingRows(rows.length);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sync.pending]);

  async function load() {
    setLoadError(false);
    try {
      setPatients(await getAllPatients());
      // One read, not N per-patient transactions.
      setVisits(await getAllVisits());
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }

  // Full follow-up queue: patients with a scheduled next visit, ordered by
  // next_visit_date so overdue items (earliest date) come first.
  const queue = useMemo<QueueItem[]>(() => {
    return patients
      .filter((p) => p.next_visit_date !== null)
      .map((p) => ({ patient: p, risk: lastRisk(visits, p.id), overdue: overdueDays(p) ?? 0 }))
      .sort((a, b) => (a.patient.next_visit_date! < b.patient.next_visit_date! ? -1 : 1));
  }, [patients, visits]);

  const counts = useMemo(
    () => ({
      today: queue.filter((i) => i.overdue === 0).length,
      overdue: queue.filter((i) => i.overdue > 0).length,
      all: queue.length,
      needsSync: pendingRows
    }),
    [queue, pendingRows]
  );

  const visible = useMemo<QueueItem[]>(() => {
    if (filter === "today") return queue.filter((i) => i.overdue === 0);
    if (filter === "overdue") return queue.filter((i) => i.overdue > 0);
    if (filter === "all") return queue;
    return [];
  }, [filter, queue]);

  const groups = useMemo(() => {
    const buckets = new Map<GroupKey, { patient: Patient }[]>();
    if (filter === "needsSync") {
      const list: { patient: Patient }[] = patients
        .filter((p) => pendingIds.has(p.id))
        .map((p) => ({ patient: p }));
      if (list.length > 0) buckets.set("waitingSync", list);
    } else {
      for (const item of visible) {
        const key: GroupKey = item.risk === "urgent" ? "urgent" : item.overdue === 0 ? "dueToday" : item.overdue > 0 ? "overdue" : "upcoming";
        const list = buckets.get(key) ?? [];
        list.push({ patient: item.patient });
        buckets.set(key, list);
      }
    }
    return GROUP_ORDER.filter((k) => buckets.has(k)).map((k) => ({ key: k, items: buckets.get(k)! }));
  }, [filter, visible, patients, pendingIds]);

  const cappedTotal = groups.reduce((n, g) => n + Math.min(g.items.length, MAX_LIST), 0);
  const totalShown = groups.reduce((n, g) => n + g.items.length, 0);

  const GROUP_META: Record<GroupKey, { title: string; explain: string; color: string; icon: LucideIcon }> = {
    urgent: {
      title: t("home.groupUrgent"),
      explain: t("home.urgentExplain"),
      color: colorToken.urgent,
      icon: AlertOctagon
    },
    dueToday: { title: t("home.groupDueToday"), explain: t("home.dueTodayExplain"), color: colorToken.neem, icon: CalendarClock },
    overdue: { title: t("home.groupOverdue"), explain: t("home.overdueExplain"), color: colorToken.clinic, icon: Hourglass },
    upcoming: { title: t("home.groupUpcoming"), explain: t("home.upcomingExplain"), color: colorToken.home, icon: CalendarDays },
    waitingSync: { title: t("home.groupWaitingSync"), explain: t("home.waitingSyncExplain"), color: colorToken["neem-dark"], icon: CloudUpload }
  };

  const EMPTY: Record<FilterKey, { icon: LucideIcon; title: string; body: string }> = {
    today: { icon: CalendarCheck, title: t("home.nothingDueTitle"), body: t("home.nothingDueBody") },
    overdue: { icon: Hourglass, title: t("home.nothingOverdueTitle"), body: t("home.nothingOverdueBody") },
    all: { icon: Users, title: t("home.nothingAllTitle"), body: t("home.nothingAllBody") },
    needsSync: { icon: CircleCheck, title: t("home.nothingSyncTitle"), body: t("home.nothingSyncBody") }
  };

  const offline = !navigator.onLine || sync.status === "offline";

  const options: FilterOption<FilterKey>[] = [
    { key: "today", label: t("home.today"), count: formatNumber(counts.today, lng) },
    { key: "overdue", label: t("home.overdue"), count: formatNumber(counts.overdue, lng) },
    { key: "all", label: t("home.all"), count: formatNumber(counts.all, lng) },
    { key: "needsSync", label: t("home.needsSync"), count: formatNumber(counts.needsSync, lng) }
  ];

  const header = (
    <header className="flex items-center justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-page font-extrabold text-ink">
          {t("home.greeting", { name: session?.worker.name ?? "" })}
        </h1>
        <p className="text-body text-neem-dark">{formatDay(todayUTC(), lng)}</p>
      </div>
      <UserRound className="size-9 shrink-0 text-neem" aria-hidden="true" />
    </header>
  );

  if (!loaded) {
    return (
      <PageShell>
        {header}
        <div className="mt-4">
          <SyncStatus onSynced={() => void load()} />
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
        <section className="mt-6" aria-label={t("home.dueListTitle")}>
          <div className="mt-3 flex flex-col gap-3">
            <DueListSkeleton count={3} />
          </div>
        </section>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        {header}
        <div className="mt-5">
          <Alert
            tone="danger"
            title={t("home.errorTitle")}
            body={t("home.errorBody")}
            actionLabel={t("common.retry")}
            onAction={() => {
              setLoaded(false);
              void load();
            }}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {header}

      <div className="mt-4">
        <SyncStatus onSynced={() => void load()} />
      </div>

      {offline ? (
        <div className="mt-3">
          <Alert tone="offline" title={t("home.offlineTitle")} body={t("home.offlineBody")} />
        </div>
      ) : null}
      {!offline && sync.status === "error" ? (
        <div className="mt-3">
          <Alert
            tone="danger"
            title={t("status.error")}
            body={t("home.errorBody")}
            actionLabel={t("status.syncNow")}
            onAction={() => void sync.syncNow()}
          />
        </div>
      ) : null}

      <div className="mt-4">
        <BigButton icon={CirclePlus} className="w-full" onClick={() => navigate("/patients/new")}>
          {t("home.addFollowUp")}
        </BigButton>
      </div>

      <div className="mt-4">
        <FilterTabs options={options} value={filter} onChange={setFilter} label={t("home.filterA11y")} />
      </div>

      {groups.length === 0 ? (
        <section className="mt-6" aria-live="polite">
          <EmptyState
            icon={EMPTY[filter].icon}
            title={EMPTY[filter].title}
            body={EMPTY[filter].body}
            actionLabel={filter === "all" ? t("home.nothingAllAction") : undefined}
            onAction={filter === "all" ? () => navigate("/patients/new") : undefined}
          />
        </section>
      ) : (
        groups.map(({ key, items }) => {
          const meta = GROUP_META[key];
          const slice = items.slice(0, MAX_LIST);
          const headCount = key === "urgent" || key === "overdue" ? items.length : undefined;
          return (
            <FollowUpGroup
              key={key}
              title={meta.title}
              explain={meta.explain}
              icon={meta.icon}
              color={meta.color}
              count={headCount}
              countColor={meta.color}
            >
              {slice.map(({ patient }, index) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  lastRiskLevel={lastRisk(visits, patient.id)}
                  waitingSync={key === "waitingSync"}
                  emphasized={key === "urgent" && index === 0}
                />
              ))}
            </FollowUpGroup>
          );
        })
      )}

      {groups.length > 0 && totalShown > MAX_LIST ? (
        <div className="mt-5">
          <BigButton variant="secondary" className="w-full" onClick={() => navigate("/patients")}>
            {t("home.seeAllPatients")}
          </BigButton>
          <p className="mt-2 text-center text-support text-neem-dark">
            {t("home.showingFirst", { n: formatNumber(cappedTotal, lng) })}
          </p>
        </div>
      ) : null}

      <details className="mt-5">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-support font-semibold text-neem-dark underline decoration-mist underline-offset-4">
          <CircleHelp className="size-4" aria-hidden="true" />
          {t("home.legendTitle")}
        </summary>
        <div className="mt-2 w-full rounded-card bg-mist/50 p-3">
          <p className="text-support text-neem-dark">{t("home.legendHint")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {URGENCY_LEGEND.map(({ risk, instructKey }) => {
              const Icon = RISK_META[risk].icon;
              return (
                <li key={risk} className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: RISK_META[risk].color }}
                  >
                    <Icon className="size-3.5 text-white" aria-hidden="true" />
                  </span>
                  <span className="text-support leading-snug text-ink">
                    <strong className="font-extrabold">{t(`risk.${risk}`)}</strong> — {t(instructKey)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </PageShell>
  );
}