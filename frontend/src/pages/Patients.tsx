import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderSearch, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { PatientCard } from "../components/PatientCard";
import { EmptyState } from "../components/EmptyState";
import { PatientListSkeleton } from "../components/Skeleton";
import { getAllPatients, getVisitsForPatient } from "../db/repo";
import { lastRisk } from "../lib/records";
import type { Condition, Patient, Visit } from "../types";

const FILTERS: (Condition | "all")[] = ["all", "hypertension", "diabetes", "tb", "pregnancy"];

export default function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Condition | "all">("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const ps = await getAllPatients();
      setPatients(ps);
      const vs: Visit[] = [];
      for (const p of ps) vs.push(...(await getVisitsForPatient(p.id)));
      setVisits(vs);
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients
      .filter((p) => (filter === "all" ? true : p.condition === filter))
      .filter(
        (p) =>
          q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.village.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, search, filter]);

  if (!loaded) {
    return (
      <PageShell>
        <h1 className="text-page font-extrabold">{t("patients.title")}</h1>

        <label className="mt-4 flex min-h-[56px] items-center gap-2 rounded-button border border-mist bg-white px-4">
          <Search className="size-5 text-neem" aria-hidden="true" />
          <span className="sr-only">{t("patients.search")}</span>
          <input
            className="w-full bg-transparent outline-none"
            placeholder={t("patients.searchPlaceholder")}
            disabled
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("patients.conditionFilter")}>
          {FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              disabled
              className={`tag min-h-[48px] opacity-50 ${
                filter === c ? "bg-neem text-white" : "bg-mist text-neem-dark"
              }`}
            >
              {c === "all" ? t("patients.allConditions") : t(`condition.${c}`)}
            </button>
          ))}
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
          className="w-full bg-transparent outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("patients.searchPlaceholder")}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("patients.conditionFilter")}>
        {FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              aria-pressed={filter === c}
              className={`tag min-h-[48px] ${
              filter === c ? "bg-neem text-white" : "bg-mist text-neem-dark"
            }`}
          >
            {c === "all" ? t("patients.allConditions") : t(`condition.${c}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderSearch}
            title={t("patients.emptyTitle")}
            actionLabel={t("patients.emptyAction")}
            onAction={() => navigate("/patients/new")}
          />
        ) : (
          filtered.map((p) => (
            <PatientCard key={p.id} patient={p} lastRiskLevel={lastRisk(visits, p.id)} />
          ))
        )}
      </div>
    </PageShell>
  );
}