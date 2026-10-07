import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderSearch, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { PatientCard } from "../components/PatientCard";
import { EmptyState } from "../components/EmptyState";
import { PatientListSkeleton } from "../components/Skeleton";
import { getAllPatients, getAllVisits } from "../db/repo";
import { lastRisk, overdueDays } from "../lib/records";
import type { Condition, Patient, Visit } from "../types";

const FILTERS: (Condition | "all")[] = ["all", "hypertension", "diabetes", "tb", "pregnancy"];

export default function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Condition | "all">("all");
  const [showOverdue, setShowOverdue] = useState(false);
  const [showUrgent, setShowUrgent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const ps = await getAllPatients();
      setPatients(ps);
      // One read, not N per-patient transactions.
      setVisits(await getAllVisits());
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients
      .filter((p) => (filter === "all" ? true : p.condition === filter))
      .filter((p) => {
        if (!showOverdue) return true;
        const od = overdueDays(p);
        return od !== null && od > 0; // strictly overdue (today is not overdue)
      })
      .filter((p) => {
        if (!showUrgent) return true;
        return lastRisk(visits, p.id) === "urgent";
      })
      .filter(
        (p) =>
          q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.village.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, visits, search, filter, showOverdue, showUrgent]);

  const emptyTitle = useMemo(() => {
    const parts: string[] = [];
    if (showUrgent) parts.push(t("patients.filterUrgent").toLowerCase());
    if (showOverdue) parts.push(t("patients.filterOverdue").toLowerCase());
    if (filter !== "all") parts.push(t(`condition.${filter}`).toLowerCase());
    if (parts.length === 0) return t("patients.emptyTitle");
    return t("patients.emptyFiltered", { filters: parts.join(" ") + " " });
  }, [showUrgent, showOverdue, filter, t]);

  if (!loaded) {
    return (
      <PageShell>
        <h1 className="text-page font-extrabold">{t("patients.title")}</h1>

        <label className="mt-4 flex min-h-[56px] items-center gap-2 rounded-button border border-mist bg-white px-4">
          <Search className="size-5 text-neem" aria-hidden="true" />
          <span className="sr-only">{t("patients.search")}</span>
          <input
            className="w-full bg-transparent text-ink outline-none"
            value=""
            readOnly
            disabled
            placeholder={t("patients.searchPlaceholder")}
          />
        </label>

        <div
          className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1"
          role="group"
          aria-label={t("patients.conditionFilter")}
        >
          {FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              disabled
              className={`tag min-h-[48px] shrink-0 whitespace-nowrap opacity-50 ${
                filter === c ? "bg-neem text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {c === "all" ? t("patients.allConditions") : t(`condition.${c}`)}
            </button>
          ))}
          <button type="button" disabled className="tag min-h-[48px] shrink-0 whitespace-nowrap bg-mist text-neem-dark opacity-50">
            {t("patients.filterUrgent")}
          </button>
          <button type="button" disabled className="tag min-h-[48px] shrink-0 whitespace-nowrap bg-mist text-neem-dark opacity-50">
            {t("patients.filterOverdue")}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <PatientListSkeleton count={4} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-page font-extrabold">{t("patients.title")}</h1>

      <label className="mt-4 flex min-h-[56px] items-center gap-2 rounded-button border border-mist bg-white px-4">
        <Search className="size-5 text-neem" aria-hidden="true" />
        <span className="sr-only">{t("patients.search")}</span>
        <input
          className="w-full bg-transparent text-ink outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("patients.searchPlaceholder")}
        />
      </label>

      <div
        className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label={t("patients.conditionFilter")}
      >
        {FILTERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={`tag min-h-[48px] shrink-0 whitespace-nowrap ${
              filter === c ? "bg-neem text-white" : "bg-mist text-neem-dark"
            }`}
          >
            {c === "all" ? t("patients.allConditions") : t(`condition.${c}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowUrgent((v) => !v)}
          aria-pressed={showUrgent}
          className={`tag min-h-[48px] shrink-0 whitespace-nowrap ${
            showUrgent ? "bg-neem text-white" : "bg-mist text-neem-dark"
          }`}
        >
          {t("patients.filterUrgent")}
        </button>
        <button
          type="button"
          onClick={() => setShowOverdue((v) => !v)}
          aria-pressed={showOverdue}
          className={`tag min-h-[48px] shrink-0 whitespace-nowrap ${
            showOverdue ? "bg-neem text-white" : "bg-mist text-neem-dark"
          }`}
        >
          {t("patients.filterOverdue")}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderSearch}
            title={emptyTitle}
            actionLabel={t("patients.emptyAction")}
            onAction={() => navigate("/patients/new")}
          />
        ) : (
          <>
            {filtered.length > 100 ? (
              <p role="status" className="text-support text-white/70">
                {t("patients.showingFirst", { count: 100, total: filtered.length })}
              </p>
            ) : null}
            {filtered.slice(0, 100).map((p) => (
              <PatientCard key={p.id} patient={p} lastRiskLevel={lastRisk(visits, p.id)} />
            ))}
          </>
        )}
      </div>
    </PageShell>
  );
}