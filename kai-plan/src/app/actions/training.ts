"use server";

import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { todayLocalDateString } from "@/lib/date";
import { nextRotationIndex } from "@/lib/rotation";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  revalidatePath("/program");
}

export async function startSession(templateId: string) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { error: "Already have an in-progress session", sessionId: existing.id };
  }

  const { data: template, error: te } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (te || !template) return { error: "Template not found" };

  const { data: state } = await supabase
    .from("program_state")
    .select("current_rotation_index")
    .eq("user_id", userId)
    .single();

  const rotationSnap = state?.current_rotation_index ?? 0;
  const dateStr = todayLocalDateString();

  const { data: session, error: se } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      date: dateStr,
      template_id: templateId,
      phase: template.phase,
      split: template.split,
      status: "in_progress",
      started_at: new Date().toISOString(),
      rotation_index_snapshot: rotationSnap,
    })
    .select("id")
    .single();

  if (se || !session) return { error: se?.message ?? "Failed to create session" };

  const { data: exercises, error: ee } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });

  if (ee) return { error: ee.message };

  for (const ex of exercises ?? []) {
    const { data: seRow, error: ie } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        template_exercise_id: ex.id,
        planned_exercise_name: ex.exercise_name,
        actual_exercise_name: ex.exercise_name,
        order_index: ex.order_index,
      })
      .select("id")
      .single();

    if (ie || !seRow) continue;

    const initialSetCount = Math.max(1, ex.target_sets + 1);
    const rows = Array.from({ length: initialSetCount }, (_, i) => ({
      session_exercise_id: seRow.id,
      set_number: i + 1,
      completed: false,
    }));
    if (rows.length) await supabase.from("set_logs").insert(rows);
  }

  revalidateAll();
  return { sessionId: session.id };
}

export async function completeSession(input: {
  sessionId: string;
  sessionNotes?: string;
  bodyweight?: number | null;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: sess } = await supabase
    .from("sessions")
    .select("started_at")
    .eq("id", input.sessionId)
    .eq("user_id", userId)
    .single();

  const completedAt = new Date().toISOString();
  let durationMinutes: number | null = null;
  if (sess?.started_at) {
    const ms =
      new Date(completedAt).getTime() - new Date(sess.started_at).getTime();
    durationMinutes = Math.max(0, Math.round(ms / 60000));
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: completedAt,
      duration_minutes: durationMinutes,
      session_notes: input.sessionNotes ?? null,
      bodyweight: input.bodyweight ?? null,
    })
    .eq("id", input.sessionId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  const { data: state } = await supabase
    .from("program_state")
    .select("current_rotation_index")
    .eq("user_id", userId)
    .single();

  const next = nextRotationIndex(state?.current_rotation_index ?? 0);
  await supabase
    .from("program_state")
    .update({ current_rotation_index: next })
    .eq("user_id", userId);

  revalidateAll();
  return { ok: true };
}

export async function updateSetLog(input: {
  id: string;
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  setNote?: string | null;
  completed?: boolean;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.weight !== undefined) patch.weight = input.weight;
  if (input.reps !== undefined) patch.reps = input.reps;
  if (input.rpe !== undefined) patch.rpe = input.rpe;
  if (input.setNote !== undefined) {
    const trimmed = input.setNote == null ? "" : input.setNote.trim();
    patch.set_note =
      trimmed === "" ? null : trimmed.toLowerCase() === "bw" ? "bw" : trimmed;
  }
  if (input.completed !== undefined) patch.completed = input.completed;

  const { error } = await supabase.from("set_logs").update(patch).eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  return { ok: true };
}

export async function addSetToSessionExercise(sessionExerciseId: string) {
  const supabase = createClient();
  const { data: existing, error: readErr } = await supabase
    .from("set_logs")
    .select("set_number")
    .eq("session_exercise_id", sessionExerciseId)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  const nextSetNumber = (existing?.set_number ?? 0) + 1;
  const { error } = await supabase.from("set_logs").insert({
    session_exercise_id: sessionExerciseId,
    set_number: nextSetNumber,
    completed: false,
  });
  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  return { ok: true };
}

export async function removeSetLog(setLogId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("set_logs").delete().eq("id", setLogId);
  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  return { ok: true };
}

export async function removeLastSetFromSessionExercise(sessionExerciseId: string) {
  const supabase = createClient();
  const { data: lastSet, error: readErr } = await supabase
    .from("set_logs")
    .select("id")
    .eq("session_exercise_id", sessionExerciseId)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) return { error: readErr.message };
  if (!lastSet) return { error: "No sets to remove." };

  const { error } = await supabase.from("set_logs").delete().eq("id", lastSet.id);
  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  return { ok: true };
}

/** Run warm-up: miles → weight, minutes → reps, avg mph → rpe */
export async function updateRunWarmupSetLog(input: {
  setLogId: string;
  miles: number | null;
  minutes: number | null;
  mph: number | null;
}) {
  const supabase = createClient();
  const mphRounded =
    input.mph != null && !Number.isNaN(input.mph)
      ? Math.round(input.mph * 10) / 10
      : null;
  const { error } = await supabase
    .from("set_logs")
    .update({
      weight: input.miles,
      reps: input.minutes,
      rpe: mphRounded,
    })
    .eq("id", input.setLogId);

  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/history");
  return { ok: true };
}

export async function updateSessionExercise(input: {
  id: string;
  exerciseNotes?: string | null;
  completed?: boolean;
  actualExerciseName?: string;
  isSubstitution?: boolean;
  substitutionReason?: string | null;
  weirdExercise?: boolean;
  weirdExerciseNotes?: string | null;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.exerciseNotes !== undefined) patch.exercise_notes = input.exerciseNotes;
  if (input.completed !== undefined) patch.completed = input.completed;
  if (input.actualExerciseName !== undefined)
    patch.actual_exercise_name = input.actualExerciseName;
  if (input.isSubstitution !== undefined) patch.is_substitution = input.isSubstitution;
  if (input.substitutionReason !== undefined)
    patch.substitution_reason = input.substitutionReason;
  if (input.weirdExercise !== undefined) patch.weird_exercise = input.weirdExercise;
  if (input.weirdExerciseNotes !== undefined)
    patch.weird_exercise_notes = input.weirdExerciseNotes;

  const { error } = await supabase
    .from("session_exercises")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/today");
  return { ok: true };
}

export async function removeSessionExercise(sessionExerciseId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId);

  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/lifts");
  return { ok: true };
}

export async function updateSessionFields(input: {
  sessionId: string;
  sessionNotes?: string | null;
  preworkoutDone?: boolean;
  weirdDay?: boolean;
  weirdDayNotes?: string | null;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const patch: Record<string, unknown> = {};
  if (input.sessionNotes !== undefined) patch.session_notes = input.sessionNotes;
  if (input.preworkoutDone !== undefined) patch.preworkout_done = input.preworkoutDone;
  if (input.weirdDay !== undefined) patch.weird_day = input.weirdDay;
  if (input.weirdDayNotes !== undefined) patch.weird_day_notes = input.weirdDayNotes;

  const { error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", input.sessionId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/history/session/${input.sessionId}`);
  return { ok: true };
}

export async function deleteSession(sessionId: string) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidateAll();
  revalidatePath(`/history/session/${sessionId}`);
  return { ok: true };
}

export async function quickCompleteRestDay(templateId: string) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: template } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (!template) return { error: "Template not found" };

  const { data: state } = await supabase
    .from("program_state")
    .select("current_rotation_index")
    .eq("user_id", userId)
    .single();

  const dateStr = todayLocalDateString();
  const { data: session, error: se } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      date: dateStr,
      template_id: templateId,
      phase: template.phase,
      split: template.split,
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: 0,
      rotation_index_snapshot: state?.current_rotation_index ?? 0,
    })
    .select("id")
    .single();

  if (se || !session) return { error: se?.message ?? "Failed" };

  const next = nextRotationIndex(state?.current_rotation_index ?? 0);
  await supabase
    .from("program_state")
    .update({ current_rotation_index: next })
    .eq("user_id", userId);

  revalidateAll();
  return { ok: true, sessionId: session.id };
}
