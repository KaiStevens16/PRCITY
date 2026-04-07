import type { LastSetPerformanceRow, SetLog } from "@/types/database";

export function isRunWarmupExercise(name: string): boolean {
  return name.trim().toLowerCase() === "run";
}

/** Stored in set_logs: weight = miles, reps = minutes (int), rpe = average mph */
/** One-line copy e.g. "10 min run / 1 mile" */
export function formatRunHumanLine(
  weight: number | null,
  reps: number | null
): string {
  const min = reps != null && !Number.isNaN(Number(reps)) ? Math.round(Number(reps)) : null;
  const mi = weight != null && !Number.isNaN(Number(weight)) ? Number(weight) : null;
  const left = min != null ? `${min} min run` : null;
  let right: string | null = null;
  if (mi != null) {
    const rounded = Math.round(mi * 100) / 100;
    const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
    right = `${s} mile${rounded === 1 ? "" : "s"}`;
  }
  if (left && right) return `${left} / ${right}`;
  return left || right || "—";
}

export function formatRunWarmupSummary(
  weight: number | null,
  reps: number | null,
  rpe: number | null
): string | null {
  const mi = weight != null && !Number.isNaN(Number(weight)) ? Number(weight) : null;
  const min = reps != null && !Number.isNaN(Number(reps)) ? Number(reps) : null;
  const mph = rpe != null && !Number.isNaN(Number(rpe)) ? Number(rpe) : null;
  const parts: string[] = [];
  if (mi != null) parts.push(`${mi.toFixed(2)} mi`);
  if (min != null) parts.push(`${Math.round(min)} min`);
  if (mph != null) parts.push(`${mph.toFixed(1)} mph avg`);
  return parts.length ? parts.join(" · ") : null;
}

export function formatRunHistorySetLine(
  log: Pick<SetLog, "set_number" | "weight" | "reps" | "rpe" | "completed">
): string {
  if (!log.completed) return `Set ${log.set_number} —`;
  const s = formatRunWarmupSummary(log.weight, log.reps, log.rpe);
  return s ?? `Set ${log.set_number} —`;
}

export function parseRunWarmupDraft(
  miStr: string,
  minStr: string,
  mphStr: string
): { miles: number | null; minutes: number | null; mph: number | null } {
  const miles = miStr.trim() === "" ? null : parseFloat(miStr);
  const minutesRaw = minStr.trim() === "" ? null : parseFloat(minStr);
  const mph = mphStr.trim() === "" ? null : parseFloat(mphStr);

  return {
    miles: miles != null && !Number.isNaN(miles) ? miles : null,
    minutes:
      minutesRaw != null && !Number.isNaN(minutesRaw) ? Math.round(minutesRaw) : null,
    mph: mph != null && !Number.isNaN(mph) ? mph : null,
  };
}

/** When two of three are known, compute the missing one for display/save */
export function reconcileRunWarmupTriplet(input: {
  miles: number | null;
  minutes: number | null;
  mph: number | null;
}): { miles: number | null; minutes: number | null; mph: number | null } {
  let { miles, minutes, mph } = input;
  const n = [miles, minutes, mph].filter((v) => v != null && v > 0).length;
  if (n < 2) return { miles, minutes, mph };

  if (miles == null && minutes != null && mph != null && mph > 0) {
    miles = mph * (minutes / 60);
  } else if (minutes == null && miles != null && mph != null && mph > 0) {
    minutes = Math.round((miles / mph) * 60);
  } else if (mph == null && miles != null && minutes != null && minutes > 0) {
    mph = miles / (minutes / 60);
  }

  return { miles, minutes, mph };
}

export function formatLastTimeRunRows(rows: LastSetPerformanceRow[]): string {
  const parts: string[] = [];
  for (const r of rows) {
    if (!r.completed) continue;
    const s = formatRunWarmupSummary(r.weight, r.reps, r.rpe);
    if (s) parts.push(s);
  }
  return parts.length ? parts.join(" · ") : "";
}
