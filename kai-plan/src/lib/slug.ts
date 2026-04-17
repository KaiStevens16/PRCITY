export function exerciseSlug(name: string): string {
  return encodeURIComponent(name.trim());
}

export function exerciseFromSlug(slug: string): string {
  return decodeURIComponent(slug);
}

/**
 * Template slot names that use `Alt1 OR Alt2` in `template_exercises.exercise_name` / logged
 * `actual_exercise_name`. Keep aligned when adding OR slots in `supabase/seed.sql`.
 */
const TEMPLATE_OR_SLOT_NAMES = [
  "Back Squats OR Front Squats",
  "Pec Deck OR Down Cables",
  "Mid Rows OR Landmine",
] as const;

function splitOrSlotName(slot: string): [string, string] | null {
  const m = /\s+OR\s+/i.exec(slot);
  if (!m || m.index === undefined || m.index <= 0) return null;
  const left = slot.slice(0, m.index).trim();
  const right = slot.slice(m.index + m[0].length).trim();
  if (!left || !right) return null;
  return [left, right];
}

/**
 * Spellings that should share one chart (template name + common abbreviations / import labels).
 * Keys are matched with {@link normalizeExerciseNameKey}. Keep aligned with `seed.sql`.
 */
export const LIFT_CHART_ALIAS_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["Flat Dumbbell Press", "Flat db press", "Flat DB Press", "Flat dumbbell press"],
  [
    "Incline Dumbbell Press",
    "Incline db press",
    "Incline DB Press",
    "Incline dumbbell press",
  ],
  [
    "Dumbbell Rows Each Arm",
    "Bentover DB row (knee on bench, single arm)",
    "DB Rows Each Arm",
    "Dumbbell rows each arm",
  ],
];

/**
 * Normalized key for matching / deduping exercise names: spacing, case, and common shorthand
 * (`db` as a whole word → `dumbbell`).
 */
export function normalizeExerciseNameKey(s: string): string {
  let x = s
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim()
    .toLowerCase();
  x = x.replace(/\bdb\b/g, "dumbbell");
  return x;
}

/**
 * On the Lifts index, a logged `Alt1 OR Alt2` slot should appear as **two** tiles (canonical
 * spellings from the protocol), not one combined row.
 */
export function expandOrSlotLoggedNameForLiftsBrowse(logged: string): string[] {
  const t = logged.trim();
  if (!t) return [];
  for (const slot of TEMPLATE_OR_SLOT_NAMES) {
    if (normalizeExerciseNameKey(t) !== normalizeExerciseNameKey(slot)) continue;
    const pair = splitOrSlotName(slot);
    if (!pair) return [t];
    return [pair[0], pair[1]].filter(Boolean);
  }
  return [t];
}

/** True when `name` is exactly a protocol `Alt1 OR Alt2` row (any casing), not a single leg. */
export function isProtocolOrSlotExerciseName(logged: string): boolean {
  const t = logged.trim();
  if (!t) return false;
  for (const slot of TEMPLATE_OR_SLOT_NAMES) {
    if (normalizeExerciseNameKey(t) === normalizeExerciseNameKey(slot)) return true;
  }
  return false;
}

function expandAliasSeeds(canonical: string): string[] {
  const k = normalizeExerciseNameKey(canonical);
  if (!k) return [];
  for (const group of LIFT_CHART_ALIAS_GROUPS) {
    if (group.some((g) => normalizeExerciseNameKey(g) === k)) {
      return [...new Set(group.map((g) => g.trim()).filter(Boolean))];
    }
  }
  return [canonical.trim()];
}

/**
 * All `actual_exercise_name` / `planned_exercise_name` strings to union for this lift chart:
 * alias group (if any), then OR-slot expansions until fixpoint.
 */
export function exerciseNamesForLiftChart(canonicalName: string): string[] {
  const trimmed = canonicalName.trim();
  if (!trimmed) return [];

  const out = new Set<string>();
  for (const s of expandAliasSeeds(trimmed)) out.add(s);

  let changed = true;
  while (changed) {
    changed = false;
    for (const name of [...out]) {
      for (const slot of TEMPLATE_OR_SLOT_NAMES) {
        const pair = splitOrSlotName(slot);
        if (!pair) continue;
        const [a, b] = pair;
        if (name === slot || name === a || name === b) {
          const before = out.size;
          out.add(slot);
          out.add(a);
          out.add(b);
          if (out.size > before) changed = true;
        }
      }
    }
  }

  return [...out];
}

/** Escape for PostgREST `ilike` value in double quotes: LIKE specials + doubled `"`. */
function escapeForExactIlikeQuoted(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '""');
}

/**
 * Build `or=(...)` filter for session_exercises: actual or planned **case-insensitive** match
 * to any variant (Postgres `ILIKE` without wildcards = same string, any casing).
 * Caller should still filter rows with {@link sessionExerciseMatchesLiftChartRow}.
 */
export function orFilterSessionExerciseLiftNames(variants: string[]): string {
  return variants
    .flatMap((n) => {
      const q = escapeForExactIlikeQuoted(n);
      return [
        `actual_exercise_name.ilike."${q}"`,
        `planned_exercise_name.ilike."${q}"`,
      ];
    })
    .join(",");
}

/**
 * Whether this session_exercise row belongs on the lift chart for `canonicalName`.
 * Accepts case-insensitive `actual_exercise_name`, or planned matching the protocol slot when the
 * athlete substituted (`is_substitution`) so logs like "Tricep CM pushdown w EZ bar" still chart
 * under **Tricep Bar Pressdowns** when that was the planned slot.
 */
export function sessionExerciseMatchesLiftChartRow(
  canonicalName: string,
  row: {
    actual_exercise_name: string;
    planned_exercise_name: string;
    is_substitution?: boolean | null;
  }
): boolean {
  const keys = new Set(exerciseNamesForLiftChart(canonicalName).map(normalizeExerciseNameKey));
  const a = normalizeExerciseNameKey(row.actual_exercise_name);
  const p = normalizeExerciseNameKey(row.planned_exercise_name);
  if (keys.has(a)) return true;
  if (keys.has(p) && (a === p || row.is_substitution === true)) return true;
  return false;
}
