"use server";

import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { isRunWarmupExercise } from "@/lib/run-warmup";

export type HistoryWorkoutSet = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  setNote: string | null;
  completed: boolean;
};

export type HistoryWorkoutBlock = {
  sessionExerciseId: string;
  orderIndex: number;
  exerciseGroup: string | null;
  title: string;
  isRunWarmup: boolean;
  sets: HistoryWorkoutSet[];
};

type SeRow = {
  id: string;
  order_index: number;
  actual_exercise_name: string;
  planned_exercise_name: string;
  template_exercise_id: string | null;
  template_exercises:
    | { exercise_group: string | null }
    | { exercise_group: string | null }[]
    | null;
};

function exerciseGroupFromRow(r: SeRow): string | null {
  const te = r.template_exercises;
  const row = Array.isArray(te) ? te[0] : te;
  return row?.exercise_group?.trim() || null;
}

export async function getHistorySessionWorkout(sessionId: string): Promise<
  { ok: true; blocks: HistoryWorkoutBlock[] } | { ok: false; error: string }
> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session) return { ok: false, error: "Session not found" };

  const { data: sessionExercises, error: seErr } = await supabase
    .from("session_exercises")
    .select(
      `
      id,
      order_index,
      actual_exercise_name,
      planned_exercise_name,
      template_exercise_id,
      template_exercises ( exercise_group )
    `
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  if (seErr) return { ok: false, error: seErr.message };

  const rows = (sessionExercises ?? []) as SeRow[];
  const seIds = rows.map((r) => r.id);
  if (!seIds.length) return { ok: true, blocks: [] };

  const { data: logs, error: logErr } = await supabase
    .from("set_logs")
    .select("id, session_exercise_id, set_number, weight, reps, rpe, set_note, completed")
    .in("session_exercise_id", seIds)
    .order("set_number", { ascending: true });

  if (logErr) return { ok: false, error: logErr.message };

  const bySe = new Map<string, HistoryWorkoutSet[]>();
  for (const l of logs ?? []) {
    const list = bySe.get(l.session_exercise_id) ?? [];
    list.push({
      id: l.id,
      setNumber: l.set_number,
      weight: l.weight,
      reps: l.reps,
      rpe: l.rpe,
      setNote: l.set_note,
      completed: l.completed,
    });
    bySe.set(l.session_exercise_id, list);
  }

  const blocks: HistoryWorkoutBlock[] = rows.map((r) => {
    const group = exerciseGroupFromRow(r);
    const isRun =
      isRunWarmupExercise(r.actual_exercise_name) &&
      (group ?? "").toLowerCase() === "warm-up";

    return {
      sessionExerciseId: r.id,
      orderIndex: r.order_index,
      exerciseGroup: group,
      title: r.actual_exercise_name,
      isRunWarmup: isRun,
      sets: bySe.get(r.id) ?? [],
    };
  });

  return { ok: true, blocks };
}
