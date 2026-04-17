import { LIFT_CHART_ALIAS_GROUPS, normalizeExerciseNameKey } from "@/lib/slug";

/** Display / sort order for muscle-area groups from `template_exercises.exercise_group`. */
export const LIFT_BODY_GROUP_ORDER = [
  "Chest",
  "Back",
  "Legs",
  "Biceps",
  "Triceps",
  "Shoulders",
  "Core",
  "Warm-up",
  "Recovery",
  "Other",
] as const;

export type LiftBodyGroup = (typeof LIFT_BODY_GROUP_ORDER)[number] | string;

export function bodyGroupSortIndex(group: string): number {
  const i = LIFT_BODY_GROUP_ORDER.indexOf(group as (typeof LIFT_BODY_GROUP_ORDER)[number]);
  return i >= 0 ? i : LIFT_BODY_GROUP_ORDER.length;
}

/**
 * When a logged name does not match `template_exercises`, map it to a muscle group from
 * common keywords (first match wins; keep order specific → general).
 */
function inferBodyGroupFromLoggedNameKey(k: string): string | null {
  if (!k) return null;

  if (k.includes("tricep")) return "Triceps";
  if (k.includes("bicep")) return "Biceps";
  if (k.includes("hammer curl")) return "Biceps";

  if (k.includes("flat bench")) return "Chest";
  if (k.includes("incline bench")) return "Chest";
  if (k.includes("pec deck") || k.includes("peck deck")) return "Chest";
  if (k.includes("down cable")) return "Chest";
  if (
    k.includes("incline cm fly") ||
    k.includes("cm fly") ||
    (k.includes("incline") && k.includes("cable") && k.includes("fly"))
  ) {
    return "Chest";
  }

  if (k.includes("low row")) return "Back";
  if (k.includes("mid row") || k.includes("landmine")) return "Back";

  return null;
}

/**
 * Map a logged `actual_exercise_name` to a template `exercise_group`, using exact template
 * names first, then {@link LIFT_CHART_ALIAS_GROUPS} so abbreviations match the protocol row,
 * then keyword inference so casual names still land in the right section.
 */
export function resolveBodyGroupForExerciseName(
  actualName: string,
  templateGroupByExerciseName: Map<string, string>
): string {
  const t = actualName.trim();
  if (!t) return "Other";
  const direct = templateGroupByExerciseName.get(t);
  if (direct) return direct;

  const k = normalizeExerciseNameKey(t);
  for (const group of LIFT_CHART_ALIAS_GROUPS) {
    if (!group.some((g) => normalizeExerciseNameKey(g) === k)) continue;
    for (const g of group) {
      const grp = templateGroupByExerciseName.get(g.trim());
      if (grp) return grp;
    }
  }
  if (k.includes("squat")) return "Legs";
  return inferBodyGroupFromLoggedNameKey(k) ?? "Other";
}

/**
 * One display row per logical lift: names that only differ by case/spacing/`db` shorthand
 * collapse to a single link. Prefer the spelling from `template_exercises` when it exists.
 */
export function dedupeLoggedExerciseNames(
  rawNames: string[],
  templateCanonicalByNormKey: Map<string, string>
): string[] {
  const byKey = new Map<string, string[]>();
  for (const raw of rawNames) {
    const t = raw.trim();
    if (!t || t === "Run") continue;
    const k = normalizeExerciseNameKey(t);
    if (k === normalizeExerciseNameKey("Run")) continue;
    const list = byKey.get(k) ?? [];
    list.push(t);
    byKey.set(k, list);
  }

  const out: string[] = [];
  for (const [, variants] of byKey) {
    const k = normalizeExerciseNameKey(variants[0]!);
    const canonical = templateCanonicalByNormKey.get(k);
    if (canonical) {
      out.push(canonical);
      continue;
    }
    const sorted = [...variants].sort(
      (a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }) || a.localeCompare(b, undefined)
    );
    out.push(sorted[0]!);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** Left accent + card tint for each body area (dark UI friendly). */
export function liftGroupCardClasses(group: string): string {
  const base = "rounded-lg border border-border/50 border-l-4 pl-3 transition-colors";
  const byGroup: Record<string, string> = {
    Chest: `${base} border-l-rose-500/90 bg-rose-500/[0.08] hover:bg-rose-500/[0.14]`,
    Back: `${base} border-l-sky-500/90 bg-sky-500/[0.08] hover:bg-sky-500/[0.14]`,
    Legs: `${base} border-l-amber-500/90 bg-amber-500/[0.08] hover:bg-amber-500/[0.14]`,
    Biceps: `${base} border-l-violet-500/90 bg-violet-500/[0.08] hover:bg-violet-500/[0.14]`,
    Triceps: `${base} border-l-teal-500/90 bg-teal-500/[0.08] hover:bg-teal-500/[0.14]`,
    Shoulders: `${base} border-l-cyan-400/85 bg-cyan-400/[0.07] hover:bg-cyan-400/[0.12]`,
    Core: `${base} border-l-lime-500/80 bg-lime-500/[0.07] hover:bg-lime-500/[0.12]`,
    "Warm-up": `${base} border-l-emerald-500/75 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.11]`,
    Recovery: `${base} border-l-emerald-600/65 bg-emerald-600/[0.06] hover:bg-emerald-600/[0.1]`,
    Other: `${base} border-l-zinc-500/70 bg-zinc-500/[0.06] hover:bg-zinc-500/[0.1]`,
  };
  return (
    byGroup[group] ??
    `${base} border-l-zinc-500/70 bg-zinc-500/[0.06] hover:bg-zinc-500/[0.1]`
  );
}

export function liftGroupHeadingDotClass(group: string): string {
  const byGroup: Record<string, string> = {
    Chest: "bg-rose-500",
    Back: "bg-sky-500",
    Legs: "bg-amber-500",
    Biceps: "bg-violet-500",
    Triceps: "bg-teal-500",
    Shoulders: "bg-cyan-400",
    Core: "bg-lime-500",
    "Warm-up": "bg-emerald-500",
    Recovery: "bg-emerald-600",
    Other: "bg-zinc-500",
  };
  return byGroup[group] ?? "bg-zinc-500";
}
