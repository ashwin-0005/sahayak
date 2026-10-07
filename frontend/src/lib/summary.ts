import { formatDate, formatTime } from "./dates";
import i18n from "../i18n";
import type { Patient, Visit } from "../types";

function getConditionLabel(condition: Patient["condition"], lng: "en" | "hi"): string {
  return i18n.t(`condition.${condition}`, { lng });
}

function getRiskLabel(level: "urgent" | "clinic" | "home", lng: "en" | "hi"): string {
  return i18n.t(`risk.${level}`, { lng });
}

function getReasonText(code: string, lng: "en" | "hi"): string {
  return i18n.t(`reason.${code}`, { lng });
}

function buildVisitReadings(v: Visit, lng: "en" | "hi"): string {
  const parts: string[] = [];
  const bpLabel = i18n.t("detail.bp", { lng });
  const sugarLabel = i18n.t("detail.sugar", { lng });

  if (v.systolic != null && v.diastolic != null) {
    parts.push(`${bpLabel} ${v.systolic}/${v.diastolic}`);
  }
  if (v.sugar_mg_dl != null) {
    const typeLabel = v.sugar_type ? ` (${i18n.t(`visit.${v.sugar_type}`, { lng })})` : "";
    parts.push(`${sugarLabel} ${v.sugar_mg_dl}${typeLabel}`);
  }
  return parts.join(", ") || i18n.t("detail.noTrend", { lng });
}

function buildVisitReasonText(codes: string[], lng: "en" | "hi"): string {
  return codes.map((c) => getReasonText(c, lng)).join(", ");
}

export function buildPatientSummary(
  patient: Patient,
  visits: Visit[],
  lng: "en" | "hi"
): string {
  const lines: string[] = [];

  // Title
  lines.push(i18n.t("detail.summaryTitle", { lng }));
  lines.push("");

  // Patient info
  lines.push(i18n.t("detail.summaryPatientInfo", { lng, name: patient.name, age: patient.age, village: patient.village }));
  lines.push(i18n.t("detail.summaryCondition", { lng, condition: getConditionLabel(patient.condition, lng) }));
  lines.push("");

  // Visits (up to 3 most recent)
  lines.push(i18n.t("detail.summaryVisits", { lng }));
  const recentVisits = [...visits]
    .filter((v) => v.patient_id === patient.id)
    .sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1))
    .slice(0, 3);

  if (recentVisits.length === 0) {
    lines.push(i18n.t("detail.summaryNoVisits", { lng }));
  } else {
    for (const v of recentVisits) {
      const dateStr = formatDate(v.visited_at, lng);
      const timeStr = formatTime(v.visited_at, lng);
      const readings = buildVisitReadings(v, lng);
      const riskLabel = getRiskLabel(v.risk_level, lng);
      const visitLine = i18n.t("detail.summaryVisitLine", {
        lng,
        date: `${dateStr} ${timeStr}`,
        readings,
        risk: riskLabel
      });
      lines.push(visitLine);
    }
  }
  lines.push("");

  // Current risk
  const lastVisit = visits
    .filter((v) => v.patient_id === patient.id)
    .sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1))[0];

  if (lastVisit) {
    const riskLabel = getRiskLabel(lastVisit.risk_level, lng);
    const reasonText = buildVisitReasonText(lastVisit.reason_codes, lng);
    const riskLine = i18n.t("detail.summaryCurrentRisk", { lng, risk: riskLabel, reason: reasonText });
    lines.push(riskLine);
  }

  return lines.join("\n");
}