import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight, CloudUpload } from "lucide-react";
import { Badge } from "./Badge";
import { RiskBadge } from "./RiskBadge";
import { ConditionBadge } from "./ConditionBadge";
import { daysOverdue, formatDate, todayUTC } from "../lib/dates";
import type { Patient, RiskLevel } from "../types";

interface PatientCardProps {
  patient: Patient;
  lastRiskLevel: RiskLevel | null;
  onClick?: () => void;
  // Marks a patient that has changes saved locally but not yet uploaded.
  waitingSync?: boolean;
}

// Patient list card with the condition-colored left rail. Risk and sync
// state are always icon + words + rail — never colour alone.
export function PatientCard({ patient, lastRiskLevel, onClick, waitingSync = false }: PatientCardProps) {
  const { t, i18n } = useTranslation();
  const lng = (i18n.language ?? "en").startsWith("hi") ? "hi" : "en";
  const overdue = patient.next_visit_date
    ? daysOverdue(patient.next_visit_date, todayUTC())
    : null;
  const risk = lastRiskLevel ?? "home";
  const railClass =
    risk === "urgent" ? "rail-urgent" : risk === "clinic" ? "rail-clinic" : "rail-home";

  return (
    <Link
      to={onClick ? "#" : `/patients/${patient.id}`}
      onClick={onClick}
      className={`card block w-full text-left transition-transform active:scale-[0.99] ${railClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-extrabold leading-tight">{patient.name}</p>
          <p className="text-support text-neem-dark">
            {patient.age}, {patient.village}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConditionBadge condition={patient.condition} />
            {waitingSync ? (
              <Badge tone="warning" icon={CloudUpload} role="status">
                {t("home.waitingToSync")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-1 text-support text-ink">
            {overdue !== null ? (
              <>
                <CalendarClock className="size-4" aria-hidden="true" />
                {overdue > 0
                  ? t("home.overdueBy", { days: overdue })
                  : overdue === 0
                    ? t("home.dueToday")
                    : t("detail.nextVisit", { date: patient.next_visit_date ? formatDate(patient.next_visit_date, lng) : "" })}
              </>
            ) : null}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <RiskBadge level={risk} />
          <ChevronRight className="size-4 text-mist" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}