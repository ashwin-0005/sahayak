// Date helpers mirror the backend's followUp service (UTC, YYYY-MM-DD).
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextVisitDate(fromIso: string, inDays: number): string {
  const d = new Date(fromIso);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  d.setUTCDate(d.getUTCDate() + inDays);
  return d.toISOString().slice(0, 10);
}

export function daysOverdue(nextVisitDateStr: string, asOfDateStr: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const due = new Date(`${nextVisitDateStr}T00:00:00Z`).getTime();
  const asOf = new Date(`${asOfDateStr}T00:00:00Z`).getTime();
  return Math.floor((asOf - due) / msPerDay);
}

export function formatDate(isoOrDate: string, locale = "en"): string {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  const fmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  return fmt.format(d);
}

export function formatTime(iso: string, locale = "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(d);
}

// Counts and readings in the user's numeral system (Devanagari digits for
// Hindi) so dates and adjacent numbers don't mix scripts.
export function formatNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN").format(value);
}

export function isSameDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}