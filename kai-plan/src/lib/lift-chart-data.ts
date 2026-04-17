import type { SupabaseClient } from "@supabase/supabase-js";
import type { SetLog } from "@/types/database";
import {
  exerciseNamesForLiftChart,
  orFilterSessionExerciseLiftNames,
  sessionExerciseMatchesLiftChartRow,
} from "@/lib/slug";
import { chartPhaseFromTemplate } from "@/lib/program-template-phase";
import type { LiftChartPoint } from "@/lib/lifts-chart";

const SESSION_ID_CHUNK = 100;
const SE_ID_CHUNK = 150;
/** PostgREST default max rows per request — page until drained. */
const PAGE_SIZE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  if (!arr.length) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type SessionHead = {
  id: string;
  date: string;
  phase: string;
  template_id: string | null;
  completed_at: string | null;
};

type SeRow = {
  id: string;
  session_id: string;
  exercise_notes: string | null;
  actual_exercise_name: string;
  planned_exercise_name: string;
  is_substitution: boolean | null;
};

/**
 * Load every chart point for a lift: completed sessions → template phase → matching
 * session_exercises → set_logs. Chunked `.in()` queries so large histories are not truncated
 * by URL limits or row caps.
 */
export async function loadLiftChartPoints(
  supabase: SupabaseClient,
  args: { userId: string; canonicalLiftName: string }
): Promise<LiftChartPoint[]> {
  const { userId, canonicalLiftName } = args;

  const { data: sessions, error: sErr } = await supabase
    .from("sessions")
    .select("id, date, phase, template_id, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("date", { ascending: true });

  if (sErr) throw new Error(sErr.message);
  if (!sessions?.length) return [];

  const templateIds = [
    ...new Set(sessions.map((s) => s.template_id).filter((id): id is string => !!id)),
  ];

  const templateById = new Map<string, { name: string; phase: string }>();
  if (templateIds.length) {
    for (const batch of chunk(templateIds, SESSION_ID_CHUNK)) {
      const { data: rows, error } = await supabase
        .from("workout_templates")
        .select("id, name, phase")
        .in("id", batch);
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) {
        templateById.set(r.id, { name: r.name ?? "", phase: r.phase ?? "" });
      }
    }
  }

  const sessionMeta = new Map<
    string,
    { date: string; completedAt: string | null; phase: string }
  >();
  for (const s of sessions as SessionHead[]) {
    const tid = s.template_id;
    const tmpl = tid ? templateById.get(tid) : undefined;
    const phase = chartPhaseFromTemplate(tmpl ?? null, s.phase);
    sessionMeta.set(s.id, {
      date: s.date,
      completedAt: s.completed_at ?? null,
      phase,
    });
  }

  const variants = exerciseNamesForLiftChart(canonicalLiftName);
  const orLift = orFilterSessionExerciseLiftNames(variants);
  const sessionIds = sessions.map((s) => s.id);

  const rawSes: SeRow[] = [];
  for (const batch of chunk(sessionIds, SESSION_ID_CHUNK)) {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("session_exercises")
        .select(
          "id, session_id, exercise_notes, actual_exercise_name, planned_exercise_name, is_substitution"
        )
        .in("session_id", batch)
        .or(orLift)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const row of rows) rawSes.push(row as SeRow);
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  const sessionExercises = rawSes.filter((se) =>
    sessionExerciseMatchesLiftChartRow(canonicalLiftName, {
      actual_exercise_name: se.actual_exercise_name,
      planned_exercise_name: se.planned_exercise_name,
      is_substitution: se.is_substitution,
    })
  );
  if (!sessionExercises.length) return [];

  const seIds = sessionExercises.map((x) => x.id);
  const logsBySe = new Map<string, SetLog[]>();
  for (const batch of chunk(seIds, SE_ID_CHUNK)) {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("set_logs")
        .select("*")
        .in("session_exercise_id", batch)
        .order("set_number", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const l of rows) {
        const id = l.session_exercise_id;
        const list = logsBySe.get(id) ?? [];
        list.push(l as SetLog);
        logsBySe.set(id, list);
      }
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  const points: LiftChartPoint[] = [];
  for (const se of sessionExercises) {
    const meta = sessionMeta.get(se.session_id);
    if (!meta) continue;
    const sets = logsBySe.get(se.id) ?? [];
    if (!sets.length) continue;
    sets.sort((a, b) => a.set_number - b.set_number);
    points.push({
      sessionId: se.session_id,
      date: meta.date,
      completedAt: meta.completedAt,
      phase: meta.phase,
      sets,
      notes: se.exercise_notes,
      actualExerciseName: se.actual_exercise_name,
    });
  }

  points.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.completedAt ?? "").localeCompare(b.completedAt ?? "") ||
      a.sessionId.localeCompare(b.sessionId)
  );
  return points;
}
