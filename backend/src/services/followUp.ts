// Next-visit scheduling: pure date arithmetic (UTC, ISO dates).
export function nextVisitDate(fromIso: string, inDays: number): string {
  const d = new Date(fromIso);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  d.setUTCDate(d.getUTCDate() + inDays);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function daysOverdue(nextVisitDateStr: string, asOfDateStr: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const due = new Date(nextVisitDateStr + "T00:00:00Z").getTime();
  const asOf = new Date(asOfDateStr + "T00:00:00Z").getTime();
  return Math.floor((asOf - due) / msPerDay);
}
