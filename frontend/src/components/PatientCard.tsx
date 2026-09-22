import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { RISK_META } from "../lib/riskMeta";
import { ConditionBadge } from "./ConditionBadge";
import { daysOverdue, formatDate, todayUTC } from "../lib/dates";
import type { Patient, RiskLevel } from "../types";

interface PatientCardProps {
  patient: Patient;
  lastRiskLevel: RiskLevel | null;
  onClick?: () => void;
}

// Patient list card with the condition-colored left rail, icon + words + color.
export function PatientCard({ patient, lastRiskLevel, onClick }: PatientCardProps) {
  const { t } = useTranslation();
  const overdue = patient.next_visit_date
    ? daysOverdue(patient.next_visit_date, todayUTC())
    : null;
  const risk = lastRiskLevel ?? "home";
  const railClass =
    risk === "urgent" ? "rail-urgent" : risk === "clinic" ? "rail-clinic" : "rail-home";
  const Icon = RISK_META[risk].icon;

  return (
    <Link
      to={onClick ? "#" : `/patients/${patient.id}`}
      onClick={onClick}
      className={`card block w-full text-left transition-transform active:scale-[0.99] ${railClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-extrabold leading-tight">{patient.name}</p>
          <p className="text-base text-neem-dark">
            {patient.age}, {patient.village}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConditionBadge condition={patient.condition} />
          </div>
          <p className="mt-2 flex items-center gap-1 text-base text-ink">
            {overdue !== null ? (
              <>
                <CalendarClock className="size-4" aria-hidden="true" />
                {overdue > 0
                  ? t("home.overdueBy", { days: overdue })
                  : overdue === 0
                    ? t("home.dueToday")
                    : t("detail.nextVisit", { date: patient.next_visit_date ? formatDate(patient.next_visit_date) : "" })}
              </>
            ) : null}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-base font-semibold text-ink">
          <Icon className="size-5" style={{ color: RISK_META[risk].color }} aria-hidden="true" />
          {t(`risk.${risk}`)}
          <ChevronRight className="size-4 text-mist" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}