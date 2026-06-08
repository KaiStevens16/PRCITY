import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { ensureProgramState } from "@/lib/ensure-program-state";
import {
  fetchActiveProgramContext,
  fetchProgramTemplates,
  fetchTrainingPrograms,
  type ProgramContext,
} from "@/lib/training-programs";
import { fetchProtocolLiftCatalog } from "@/lib/protocol-lifts";
import { loadWeightRows } from "@/lib/weight-data";
import {
  startOfWeekMonday,
  todayLocalDateString,
  toDateString,
} from "@/lib/date";
import { epley1Rm } from "@/lib/e1rm";
import type { TrainingProgram } from "@/types/database";
import type { TemplateExercise } from "@/types/database";
import { CACHE_TAGS } from "@/lib/cache-tags";

/** Per-request dedup of program_state (also ensures row exists). */
export const getProgramState = cache(async () => {
  const supabase = createClient();
  const userId = getSoloUserId();
  await ensureProgramState(supabase, userId);
  const { data, error } = await supabase
    .from("program_state")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
});

export async function getCachedProgramState() {
  const userId = getSoloUserId();
  return unstable_cache(
    async () => getProgramState(),
    [`program-state-${userId}`],
    { revalidate: 20, tags: [CACHE_TAGS.program] }
  )();
}

export async function getCachedProgramContext(): Promise<ProgramContext | null> {
  const userId = getSoloUserId();
  return unstable_cache(
    async () => {
      const supabase = createClient();
      const state = await getProgramState();
      return fetchActiveProgramContext(supabase, state?.active_program_id);
    },
    [`program-context-${userId}`],
    { revalidate: 60, tags: [CACHE_TAGS.program] }
  )();
}

export type DashboardSnapshot = {
  state: Awaited<ReturnType<typeof getProgramState>>;
  ctx: ProgramContext | null;
  inProgress: { id: string; template_id: string } | null;
  weekSessions: {
    id: string;
    date: string;
    status: string;
    split: string;
    duration_minutes: number | null;
    bodyweight: number | null;
  }[];
  weekRunMiles: number;
  recent: {
    id: string;
    date: string;
    status: string;
    split: string;
    phase: string;
    duration_minutes: number | null;
    session_notes: string | null;
    weird_day: boolean | null;
    weird_day_notes: string | null;
  }[];
  topLiftLines: [string, { e1: number; weight: number; reps: number }][];
  lastWeight: { date: string; weight: number; notes: string } | null;
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const userId = getSoloUserId();
  return unstable_cache(
    async () => {
      const supabase = createClient();
      const state = await getProgramState();
      const ctx = await fetchActiveProgramContext(supabase, state?.active_program_id);

      const monday = startOfWeekMonday(new Date());
      const weekStart = toDateString(monday);
      const weekEndDate = new Date(monday);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = toDateString(weekEndDate);

      const [inProgressRes, weekSessionsRes, recentRes, recentSessRes, weightRows] =
        await Promise.all([
          supabase
            .from("sessions")
            .select("id, template_id")
            .eq("user_id", userId)
            .eq("status", "in_progress")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("sessions")
            .select("id, date, status, split, duration_minutes, bodyweight")
            .eq("user_id", userId)
            .gte("date", weekStart)
            .lte("date", weekEnd)
            .order("date", { ascending: false }),
          supabase
            .from("sessions")
            .select(
              "id, date, status, split, phase, duration_minutes, session_notes, weird_day, weird_day_notes"
            )
            .eq("user_id", userId)
            .eq("status", "completed")
            .order("date", { ascending: false })
            .limit(6),
          supabase
            .from("sessions")
            .select("id, date")
            .eq("user_id", userId)
            .eq("status", "completed")
            .order("date", { ascending: false })
            .limit(40),
          loadWeightRows(),
        ]);

      const weekSessions = weekSessionsRes.data ?? [];
      const completedWeekIds = weekSessions
        .filter((s) => s.status === "completed")
        .map((s) => s.id);

      let weekRunMiles = 0;
      let topLiftLines: DashboardSnapshot["topLiftLines"] = [];

      const sessionIds = (recentSessRes.data ?? []).map((s) => s.id);

      const [runMilesResult, topLiftsResult] = await Promise.all([
        (async () => {
          if (!completedWeekIds.length) return 0;
          const { data: runEx } = await supabase
            .from("session_exercises")
            .select("id")
            .in("session_id", completedWeekIds)
            .or("planned_exercise_name.eq.Run,actual_exercise_name.eq.Run");
          const runSeIds = (runEx ?? []).map((x) => x.id);
          if (!runSeIds.length) return 0;
          const { data: mileLogs } = await supabase
            .from("set_logs")
            .select("weight")
            .in("session_exercise_id", runSeIds)
            .not("weight", "is", null);
          return (mileLogs ?? []).reduce((a, x) => a + Number(x.weight), 0);
        })(),
        (async () => {
          if (!sessionIds.length) return [] as DashboardSnapshot["topLiftLines"];
          const { data: ses } = await supabase
            .from("session_exercises")
            .select("id, actual_exercise_name, session_id")
            .in("session_id", sessionIds);
          const seIds = (ses ?? []).map((s) => s.id);
          const seName = new Map((ses ?? []).map((s) => [s.id, s.actual_exercise_name]));
          if (!seIds.length) return [];
          const { data: logs } = await supabase
            .from("set_logs")
            .select("session_exercise_id, weight, reps")
            .in("session_exercise_id", seIds)
            .not("weight", "is", null)
            .not("reps", "is", null);

          const byExercise = new Map<string, { e1: number; weight: number; reps: number }>();
          for (const row of logs ?? []) {
            const name = seName.get(row.session_exercise_id) ?? "Lift";
            if (name === "Run") continue;
            const e1 = epley1Rm(Number(row.weight), Number(row.reps));
            if (e1 == null) continue;
            const prev = byExercise.get(name);
            if (!prev || e1 > prev.e1) {
              byExercise.set(name, {
                e1,
                weight: Number(row.weight),
                reps: Number(row.reps),
              });
            }
          }
          return [...byExercise.entries()]
            .sort((a, b) => b[1].e1 - a[1].e1)
            .slice(0, 5);
        })(),
      ]);

      weekRunMiles = runMilesResult;
      topLiftLines = topLiftsResult;

      const lastWeight = weightRows.length ? weightRows[weightRows.length - 1] : null;

      return {
        state,
        ctx,
        inProgress: inProgressRes.data ?? null,
        weekSessions,
        weekRunMiles,
        recent: recentRes.data ?? [],
        topLiftLines,
        lastWeight,
      };
    },
    [`dashboard-${userId}-${todayLocalDateString()}`],
    { revalidate: 30, tags: [CACHE_TAGS.dashboard, CACHE_TAGS.sessions] }
  )();
}

export type HistorySessionRow = {
  id: string;
  date: string;
  status: string;
  template_id: string | null;
  split: string;
  phase: string;
  duration_minutes: number | null;
  session_notes: string | null;
  weird_day: boolean | null;
  weird_day_notes: string | null;
  workout_templates:
    | { name: string; phase: string }
    | { name: string; phase: string }[]
    | null;
  training_programs:
    | { name: string; era_label: string }
    | { name: string; era_label: string }[]
    | null;
};

export async function getCachedHistorySessions(): Promise<HistorySessionRow[]> {
  const userId = getSoloUserId();
  return unstable_cache(
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("sessions")
        .select(
          `
          id,
          date,
          status,
          template_id,
          split,
          phase,
          duration_minutes,
          session_notes,
          weird_day,
          weird_day_notes,
          workout_templates ( name, phase ),
          training_programs ( name, era_label )
        `
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(200);
      return (data ?? []) as HistorySessionRow[];
    },
    [`history-sessions-${userId}`],
    { revalidate: 30, tags: [CACHE_TAGS.sessions, CACHE_TAGS.dashboard] }
  )();
}

export async function getCachedLiftCatalog(programId: string | null | undefined) {
  const userId = getSoloUserId();
  const pid = programId ?? "default";
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return fetchProtocolLiftCatalog(supabase, programId);
    },
    [`lift-catalog-${userId}-${pid}`],
    { revalidate: 120, tags: [CACHE_TAGS.lifts, CACHE_TAGS.program] }
  )();
}

export type ProgramPageSnapshot = {
  programs: TrainingProgram[];
  state: { current_rotation_index: number; active_program_id: string } | null;
  templates: Awaited<ReturnType<typeof fetchProgramTemplates>>;
  exercisesByTemplate: Record<string, TemplateExercise[]>;
};

export async function getCachedProgramPageData(
  viewingProgramId: string
): Promise<ProgramPageSnapshot> {
  const userId = getSoloUserId();
  return unstable_cache(
    async () => {
      const supabase = createClient();
      const [programs, stateRes] = await Promise.all([
        fetchTrainingPrograms(supabase),
        supabase
          .from("program_state")
          .select("current_rotation_index, active_program_id")
          .eq("user_id", userId)
          .single(),
      ]);

      const templates = await fetchProgramTemplates(supabase, viewingProgramId);
      const loaded = await Promise.all(
        templates.map(async (t) => {
          const { data } = await supabase
            .from("template_exercises")
            .select("*")
            .eq("template_id", t.id)
            .order("order_index", { ascending: true });
          return [t.id, (data ?? []) as TemplateExercise[]] as const;
        })
      );

      const exercisesByTemplate: Record<string, TemplateExercise[]> = {};
      for (const [id, exercises] of loaded) {
        exercisesByTemplate[id] = exercises;
      }

      return {
        programs,
        state: stateRes.data,
        templates,
        exercisesByTemplate,
      };
    },
    [`program-page-${userId}-${viewingProgramId}`],
    { revalidate: 120, tags: [CACHE_TAGS.protocol, CACHE_TAGS.program] }
  )();
}
