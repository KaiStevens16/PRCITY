import type { SupabaseClient } from "@supabase/supabase-js";
import { expandOrSlotLoggedNameForLiftsBrowse } from "@/lib/slug";

export type ProtocolLiftRow = { name: string; group: string };

/**
 * Distinct lifts from the active program (`workout_templates` + `template_exercises`), with
 * OR slots expanded into separate protocol names (e.g. Back Squats / Front Squats).
 */
export async function fetchProtocolLiftCatalog(supabase: SupabaseClient): Promise<{
  lifts: ProtocolLiftRow[];
  /** `exercise_name` → `exercise_group` from templates (pre-OR expansion) for {@link resolveBodyGroupForExerciseName}. */
  templateGroupByName: Map<string, string>;
}> {
  const { data: templates, error: e1 } = await supabase
    .from("workout_templates")
    .select("id")
    .eq("is_active", true);
  if (e1) throw new Error(e1.message);
  const templateIds = (templates ?? []).map((t) => t.id);
  if (!templateIds.length) return { lifts: [], templateGroupByName: new Map() };

  const { data: rows, error: e2 } = await supabase
    .from("template_exercises")
    .select("exercise_name, exercise_group")
    .in("template_id", templateIds);
  if (e2) throw new Error(e2.message);

  const groupByExercise = new Map<string, string>();
  for (const r of rows ?? []) {
    const n = r.exercise_name?.trim();
    if (!n || n === "Run") continue;
    const g = r.exercise_group?.trim() || "Other";
    if (!groupByExercise.has(n)) groupByExercise.set(n, g);
  }

  const seenDisplay = new Set<string>();
  const lifts: ProtocolLiftRow[] = [];
  for (const [templateName, group] of groupByExercise) {
    for (const name of expandOrSlotLoggedNameForLiftsBrowse(templateName)) {
      if (seenDisplay.has(name)) continue;
      seenDisplay.add(name);
      lifts.push({ name, group });
    }
  }

  lifts.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { lifts, templateGroupByName: groupByExercise };
}
