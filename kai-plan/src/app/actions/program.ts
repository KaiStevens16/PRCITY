"use server";

import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { nextRotationIndex, prevRotationIndex } from "@/lib/rotation";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/program");
}

export async function adjustRotation(delta: 1 | -1) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: state } = await supabase
    .from("program_state")
    .select("current_rotation_index")
    .eq("user_id", userId)
    .single();

  const cur = state?.current_rotation_index ?? 0;
  const next = delta === 1 ? nextRotationIndex(cur) : prevRotationIndex(cur);

  const { error } = await supabase
    .from("program_state")
    .update({ current_rotation_index: next })
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidate();
  return { ok: true, current_rotation_index: next };
}

export async function setRotationIndex(index: number) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const n = ((index % 8) + 8) % 8;
  const { error } = await supabase
    .from("program_state")
    .update({ current_rotation_index: n })
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateProgramMetadata(input: {
  currentBlockName?: string;
  currentObjective?: string;
  timelineNote?: string;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();

  const patch: Record<string, unknown> = {};
  if (input.currentBlockName !== undefined)
    patch.current_block_name = input.currentBlockName;
  if (input.currentObjective !== undefined)
    patch.current_objective = input.currentObjective;
  if (input.timelineNote !== undefined) patch.timeline_note = input.timelineNote;

  const { error } = await supabase
    .from("program_state")
    .update(patch)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/program");
  return { ok: true };
}

export async function updateWorkoutTemplate(input: {
  id: string;
  name?: string;
  estimated_duration_minutes?: number;
  preworkout_note?: string | null;
  warmup_note?: string | null;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.estimated_duration_minutes !== undefined)
    patch.estimated_duration_minutes = input.estimated_duration_minutes;
  if (input.preworkout_note !== undefined) patch.preworkout_note = input.preworkout_note;
  if (input.warmup_note !== undefined) patch.warmup_note = input.warmup_note;

  const { error } = await supabase
    .from("workout_templates")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/program");
  revalidatePath("/today");
  return { ok: true };
}

export async function updateTemplateExercise(input: {
  id: string;
  exercise_name?: string;
  exercise_group?: string | null;
  target_sets?: number;
  rep_min?: number;
  rep_max?: number;
  intensity_note?: string | null;
  rest_seconds?: number;
  order_index?: number;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.exercise_name !== undefined) patch.exercise_name = input.exercise_name;
  if (input.exercise_group !== undefined) patch.exercise_group = input.exercise_group;
  if (input.target_sets !== undefined) patch.target_sets = input.target_sets;
  if (input.rep_min !== undefined) patch.rep_min = input.rep_min;
  if (input.rep_max !== undefined) patch.rep_max = input.rep_max;
  if (input.intensity_note !== undefined) patch.intensity_note = input.intensity_note;
  if (input.rest_seconds !== undefined) patch.rest_seconds = input.rest_seconds;
  if (input.order_index !== undefined) patch.order_index = input.order_index;

  const { error } = await supabase
    .from("template_exercises")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/program");
  revalidatePath("/today");
  return { ok: true };
}

export async function reorderTemplateExercise(
  templateId: string,
  exerciseId: string,
  direction: "up" | "down"
) {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("template_exercises")
    .select("id, order_index")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });

  if (!rows?.length) return { error: "No exercises" };

  const idx = rows.findIndex((r) => r.id === exerciseId);
  if (idx < 0) return { error: "Exercise not found" };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) return { ok: true };

  const a = rows[idx];
  const b = rows[swapWith];
  const oldA = a.order_index;
  const oldB = b.order_index;
  const tmp = Math.max(...rows.map((r) => r.order_index), 0) + 1000;

  await supabase
    .from("template_exercises")
    .update({ order_index: tmp })
    .eq("id", a.id);
  await supabase
    .from("template_exercises")
    .update({ order_index: oldA })
    .eq("id", b.id);
  await supabase
    .from("template_exercises")
    .update({ order_index: oldB })
    .eq("id", a.id);

  revalidatePath("/program");
  return { ok: true };
}
