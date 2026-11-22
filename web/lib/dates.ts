/** "25/11" */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Quantos dias de calendário se passaram desde `iso` até `now` (0 = hoje).
 * Compara só as DATAS (meia-noite com meia-noite): 23h de ontem → 1 dia, não 0.
 */
export function daysSince(iso: string, now: Date = new Date()): number {
  const day = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(now) - startOf(day)) / (24 * 60 * 60 * 1000));
}

/** "hoje" / "atrasado há 1 dia" / "atrasado há 3 dias" */
export function followupLabel(nextFollowupAt: string, now: Date = new Date()): string {
  const late = daysSince(nextFollowupAt, now);
  if (late <= 0) return "hoje";
  return `atrasado há ${late} ${late === 1 ? "dia" : "dias"}`;
}
