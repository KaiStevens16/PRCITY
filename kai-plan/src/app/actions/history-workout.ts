"use server";

import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { isRunWarmupExercise } from "@/lib/run-warmup";
import { revalidatePath } from "next/cache";

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
  weirdExercise: boolean;
  weirdExerciseNotes: string | null;
};

type SeRow = {
  id: string;
  order_index: number;
  actual_exercise_name: string;
  planned_exercise_name: string;
  template_exercise_id: string | null;
  weird_exercise: boolean | null;
  weird_exercise_notes: string | null;
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
  | {
      ok: true;
      blocks: HistoryWorkoutBlock[];
      weirdDay: boolean;
      weirdDayNotes: string | null;
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, weird_day, weird_day_notes")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!session) return { ok: false, error: "Session not found" };

  const weirdDay = session.weird_day === true;
  const weirdDayNotes =
    typeof session.weird_day_notes === "string" && session.weird_day_notes.trim()
      ? session.weird_day_notes
      : null;

  const { data: sessionExercises, error: seErr } = await supabase
    .from("session_exercises")
    .select(
      `
      id,
      order_index,
      actual_exercise_name,
      planned_exercise_name,
      template_exercise_id,
      weird_exercise,
      weird_exercise_notes,
      template_exercises ( exercise_group )
    `
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  if (seErr) return { ok: false, error: seErr.message };

  const rows = (sessionExercises ?? []) as SeRow[];
  const seIds = rows.map((r) => r.id);
  if (!seIds.length) return { ok: true, blocks: [], weirdDay, weirdDayNotes };

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
      weirdExercise: r.weird_exercise === true,
      weirdExerciseNotes:
        typeof r.weird_exercise_notes === "string" && r.weird_exercise_notes.trim()
          ? r.weird_exercise_notes
          : null,
    };
  });

  return { ok: true, blocks, weirdDay, weirdDayNotes };
}

export async function quickAddWorkout(input: {
  date: string;
  templateId: string;
  liftName: string;
  weight: number | null;
  reps: number | null;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();
  const liftName = input.liftName.trim();
  if (!liftName) return { error: "Lift name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Invalid date." };

  const { data: template, error: tErr } = await supabase
    .from("workout_templates")
    .select("id, name, phase, split")
    .eq("id", input.templateId)
    .eq("is_active", true)
    .single();
  if (tErr || !template) return { error: "Select a valid workout template." };

  const nowIso = new Date().toISOString();
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      date: input.date,
      template_id: template.id,
      phase: template.phase,
      split: template.split,
      status: "completed",
      started_at: nowIso,
      completed_at: nowIso,
      duration_minutes: 0,
      session_notes: null,
      weird_day: false,
    })
    .select("id")
    .single();

  if (sErr || !session) return { error: sErr?.message ?? "Failed to create session." };

  const { data: se, error: seErr } = await supabase
    .from("session_exercises")
    .insert({
      session_id: session.id,
      template_exercise_id: null,
      planned_exercise_name: liftName,
      actual_exercise_name: liftName,
      order_index: 0,
      completed: true,
    })
    .select("id")
    .single();

  if (seErr || !se) return { error: seErr?.message ?? "Failed to create exercise." };

  const { error: setErr } = await supabase.from("set_logs").insert({
    session_exercise_id: se.id,
    set_number: 1,
    weight: input.weight,
    reps: input.reps,
    completed: true,
  });

  if (setErr) return { error: setErr.message };

  revalidatePath("/history");
  revalidatePath("/lifts");
  revalidatePath("/");
  return { ok: true, sessionId: session.id };
}

type ParsedSet = {
  weight: number | null;
  reps: number;
  setNote: string | null;
};

type ParsedExercise = {
  name: string;
  sets: ParsedSet[];
};

function isSeparatorLine(line: string): boolean {
  return /^[-—_=\s]{3,}$/.test(line);
}

function parseSetLine(line: string): ParsedSet | null {
  const m = line
    .trim()
    .match(/^(bw|\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*for\s*(\d+)\s*$/i);
  if (!m) return null;
  const reps = Number(m[2]);
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (m[1].toLowerCase() === "bw") {
    return { weight: null, reps, setNote: "bw" };
  }
  const weight = Number(m[1]);
  if (!Number.isFinite(weight) || weight < 0) return null;
  return { weight, reps, setNote: null };
}

function parseBulkWorkoutText(rawText: string): ParsedExercise[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ParsedExercise[] = [];
  let current: ParsedExercise | null = null;

  for (const line of lines) {
    if (isSeparatorLine(line)) {
      if (current && current.sets.length) out.push(current);
      current = null;
      continue;
    }

    const parsedSet = parseSetLine(line);
    if (parsedSet) {
      if (!current) {
        // Ignore stray set lines without an exercise header.
        continue;
      }
      current.sets.push(parsedSet);
      continue;
    }

    // New exercise header
    if (current && current.sets.length) out.push(current);
    current = { name: line, sets: [] };
  }

  if (current && current.sets.length) out.push(current);
  return out;
}

export async function quickAddWorkoutBulk(input: {
  date: string;
  templateId: string;
  rawText: string;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Invalid date." };

  const parsed = parseBulkWorkoutText(input.rawText);
  if (!parsed.length) {
    return {
      error:
        "Could not parse workout text. Use one exercise name line followed by lines like '185 for 4'.",
    };
  }

  const { data: template, error: tErr } = await supabase
    .from("workout_templates")
    .select("id, phase, split")
    .eq("id", input.templateId)
    .eq("is_active", true)
    .single();
  if (tErr || !template) return { error: "Select a valid workout template." };

  const nowIso = new Date().toISOString();
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      date: input.date,
      template_id: template.id,
      phase: template.phase,
      split: template.split,
      status: "completed",
      started_at: nowIso,
      completed_at: nowIso,
      duration_minutes: 0,
      session_notes: null,
      weird_day: false,
    })
    .select("id")
    .single();

  if (sErr || !session) return { error: sErr?.message ?? "Failed to create session." };

  for (let i = 0; i < parsed.length; i++) {
    const ex = parsed[i];
    const { data: se, error: seErr } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        template_exercise_id: null,
        planned_exercise_name: ex.name,
        actual_exercise_name: ex.name,
        order_index: i,
        completed: true,
      })
      .select("id")
      .single();
    if (seErr || !se) return { error: seErr?.message ?? "Failed to create exercise rows." };

    const setRows = ex.sets.map((s, idx) => ({
      session_exercise_id: se.id,
      set_number: idx + 1,
      weight: s.weight,
      reps: s.reps,
      set_note: s.setNote,
      completed: true,
    }));
    if (setRows.length) {
      const { error: setErr } = await supabase.from("set_logs").insert(setRows);
      if (setErr) return { error: setErr.message };
    }
  }

  revalidatePath("/history");
  revalidatePath("/lifts");
  revalidatePath("/");
  return { ok: true, sessionId: session.id };
}

export async function quickAddWorkoutFromTemplate(input: {
  date: string;
  templateId: string;
  entries: Array<{
    exerciseName: string;
    sets: Array<{ weightText: string; repsText: string }>;
  }>;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Invalid date." };

  const { data: template, error: tErr } = await supabase
    .from("workout_templates")
    .select("id, phase, split")
    .eq("id", input.templateId)
    .eq("is_active", true)
    .single();
  if (tErr || !template) return { error: "Select a valid workout template." };

  const normalized = input.entries
    .map((e) => ({
      exerciseName: e.exerciseName.trim(),
      sets: e.sets
        .map((s) => {
          const reps = s.repsText.trim() === "" ? null : Number(s.repsText);
          const wt = s.weightText.trim();
          if (!reps || !Number.isFinite(reps) || reps <= 0) return null;
          if (wt.toLowerCase() === "bw") {
            return { reps, weight: null as number | null, setNote: "bw" as string | null };
          }
          const weightNum = wt === "" ? null : Number(wt);
          if (weightNum != null && !Number.isFinite(weightNum)) return null;
          return { reps, weight: weightNum, setNote: null as string | null };
        })
        .filter((x): x is { reps: number; weight: number | null; setNote: string | null } => x != null),
    }))
    .filter((e) => e.exerciseName && e.sets.length > 0);

  if (!normalized.length) {
    return { error: "Enter at least one valid set before saving." };
  }

  const nowIso = new Date().toISOString();
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      date: input.date,
      template_id: template.id,
      phase: template.phase,
      split: template.split,
      status: "completed",
      started_at: nowIso,
      completed_at: nowIso,
      duration_minutes: 0,
      session_notes: null,
      weird_day: false,
    })
    .select("id")
    .single();
  if (sErr || !session) return { error: sErr?.message ?? "Failed to create session." };

  for (let i = 0; i < normalized.length; i++) {
    const ex = normalized[i];
    const { data: se, error: seErr } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        template_exercise_id: null,
        planned_exercise_name: ex.exerciseName,
        actual_exercise_name: ex.exerciseName,
        order_index: i,
        completed: true,
      })
      .select("id")
      .single();
    if (seErr || !se) return { error: seErr?.message ?? "Failed to create exercise rows." };

    const setRows = ex.sets.map((s, idx) => ({
      session_exercise_id: se.id,
      set_number: idx + 1,
      weight: s.weight,
      reps: s.reps,
      set_note: s.setNote,
      completed: true,
    }));
    const { error: setErr } = await supabase.from("set_logs").insert(setRows);
    if (setErr) return { error: setErr.message };
  }

  revalidatePath("/history");
  revalidatePath("/lifts");
  revalidatePath("/");
  return { ok: true, sessionId: session.id };
}
