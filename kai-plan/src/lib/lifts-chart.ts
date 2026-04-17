import type { Data, Layout } from "plotly.js";
import type { SetLog } from "@/types/database";
import { formatLongDate } from "@/lib/date";

/** Hypertrophy legs OR slot — same string as `template_exercises.exercise_name`. */
export const HYPERTROPHY_SQUAT_OR_SLOT = "Back Squats OR Front Squats";

export function phaseMatchesChart(
  phase: string,
  target: "Hypertrophy" | "Strength"
): boolean {
  return phase.trim().toLowerCase() === target.toLowerCase();
}

export function isSquatLiftPageName(canonicalName: string): boolean {
  const n = canonicalName.trim();
  return n === "Back Squats" || n === "Front Squats";
}

/** Triceps accessories — strength-phase top-set chart is omitted (hypertrophy-focused). */
export function isTricepLiftPageName(canonicalName: string): boolean {
  return canonicalName.trim().toLowerCase().includes("tricep");
}

export type SquatVariant = "back" | "front" | "unspecified";

export function squatVariantFromActualName(actual: string): SquatVariant {
  const a = actual.trim();
  if (a === "Front Squats") return "front";
  if (a === "Back Squats") return "back";
  if (a === HYPERTROPHY_SQUAT_OR_SLOT) return "unspecified";
  return "unspecified";
}

export function topSetLoadRepsProduct(sets: SetLog[]): number {
  let best = 0;
  for (const s of sets) {
    if (s.weight != null && s.reps != null) {
      best = Math.max(best, Number(s.weight) * Number(s.reps));
    }
  }
  return best;
}

export type LiftChartPoint = {
  /** Parent session id (one point per matching session_exercise row). */
  sessionId: string;
  date: string;
  /** Session end time when present — spreads same-calendar-day sessions on the x-axis. */
  completedAt: string | null;
  phase: string;
  sets: SetLog[];
  notes: string | null;
  actualExerciseName: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Widen the x window when there is a single marker so Plotly does not repeat bogus ticks. */
export function liftPhaseChartXAxis(phasePoints: LiftChartPoint[]): Partial<Layout["xaxis"]> {
  const base: Partial<Layout["xaxis"]> = {
    type: "date",
    tickformat: "%B %-d, %Y",
    automargin: true,
  };
  const xs = phasePoints.map((p) => plotlyXForLiftPoint(p));
  if (xs.length === 1) {
    const ms = Date.parse(xs[0]);
    if (Number.isFinite(ms)) {
      return {
        ...base,
        range: [new Date(ms - 2 * DAY_MS).toISOString(), new Date(ms + 2 * DAY_MS).toISOString()],
      };
    }
  }
  return base;
}

export function phaseScatterLineShape(n: number): "linear" | "spline" {
  return n < 3 ? "linear" : "spline";
}

/** Plotly `x` for lift trends: real timestamps when available so same-day sessions do not overlap. */
export function plotlyXForLiftPoint(p: LiftChartPoint): string {
  if (p.completedAt) return p.completedAt;
  return `${p.date}T12:00:00.000Z`;
}

/** One chart, different markers for back vs front vs unpicked hypertrophy OR slot. */
export function buildSquatTopSetTraces(points: LiftChartPoint[]): Data[] {
  const back = points.filter((p) => squatVariantFromActualName(p.actualExerciseName) === "back");
  const front = points.filter((p) => squatVariantFromActualName(p.actualExerciseName) === "front");
  const uns = points.filter(
    (p) => squatVariantFromActualName(p.actualExerciseName) === "unspecified"
  );

  const trace = (
    label: string,
    pts: LiftChartPoint[],
    color: string,
    symbol: "circle" | "square" | "diamond"
  ): Data => ({
    type: "scatter",
    mode: "lines+markers",
    name: label,
    x: pts.map((p) => plotlyXForLiftPoint(p)),
    y: pts.map((p) => topSetLoadRepsProduct(p.sets)),
    customdata: pts.map((p) => formatLongDate(p.date)),
    hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
    line: { color, width: 2, shape: "spline" },
    marker: { size: 9, color, symbol, line: { width: 0 } },
  });

  const out: Data[] = [];
  if (back.length) out.push(trace("Back squat", back, "hsl(22 92% 58%)", "circle"));
  if (front.length) out.push(trace("Front squat", front, "hsl(196 100% 55%)", "square"));
  if (uns.length) {
    out.push(trace("Hypertrophy slot — pick back or front on /today", uns, "hsl(220 14% 46%)", "diamond"));
  }
  if (!out.length) {
    return [
      {
        type: "scatter",
        mode: "markers",
        name: "No data",
        x: [],
        y: [],
      },
    ];
  }
  return out;
}
