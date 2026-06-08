import type { SupabaseClient } from "@supabase/supabase-js";
import type { LastSetPerformanceRow } from "@/types/database";

export async function fetchLastSetPerformance(
  supabase: SupabaseClient,
  userId: string,
  templateExerciseId: string,
  exerciseName: string,
  beforeDate: string,
  excludeSessionId?: string | null
): Promise<LastSetPerformanceRow[]> {
  const { data, error } = await supabase.rpc("get_last_set_performance", {
    p_user_id: userId,
    p_template_exercise_id: templateExerciseId,
    p_before_date: beforeDate,
    p_exclude_session_id: excludeSessionId ?? null,
  });
  if (!error && data?.length) return data as LastSetPerformanceRow[];

  const name = exerciseName.trim();
  if (!name) return [];

  let q = supabase
    .from("sessions")
    .select(
      `
      id,
      date,
      session_exercises!inner (
        id,
        actual_exercise_name,
        set_logs (
          set_number,
          weight,
          reps,
          rpe,
          set_note,
          completed
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(40);

  if (excludeSessionId) {
    q = q.neq("id", excludeSessionId);
  }

  const { data: sessions, error: se } = await q;
  if (se || !sessions?.length) return [];

  for (const sess of sessions) {
    const exercises = Array.isArray(sess.session_exercises)
      ? sess.session_exercises
      : [sess.session_exercises];
    const match = exercises.find(
      (ex) =>
        ex.actual_exercise_name?.trim().toLowerCase() === name.toLowerCase()
    );
    if (!match?.set_logs?.length) continue;
    const logs = [...match.set_logs].sort((a, b) => a.set_number - b.set_number);
    return logs.map((sl) => ({
      session_id: sess.id,
      session_date: sess.date,
      set_number: sl.set_number,
      weight: sl.weight,
      reps: sl.reps,
      rpe: sl.rpe,
      set_note: sl.set_note,
      completed: sl.completed,
    }));
  }

  return [];
}
