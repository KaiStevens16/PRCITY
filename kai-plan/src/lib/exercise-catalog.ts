import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export async function fetchExerciseNameCatalog(
  supabase: SupabaseClient
): Promise<string[]> {
  const names = new Set<string>();

  const { data: templateRows } = await supabase
    .from("template_exercises")
    .select("exercise_name");
  for (const row of templateRows ?? []) {
    const n = normalizeName(row.exercise_name ?? "");
    if (n) names.add(n);
  }

  const { data: sessionRows } = await supabase
    .from("session_exercises")
    .select("actual_exercise_name")
    .limit(2000);
  for (const row of sessionRows ?? []) {
    const n = normalizeName(row.actual_exercise_name ?? "");
    if (n) names.add(n);
  }

  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function filterExerciseNames(names: string[], query: string, limit = 20): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return names.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push(name);
    else if (lower.includes(q)) contains.push(name);
    if (starts.length + contains.length >= limit * 2) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
