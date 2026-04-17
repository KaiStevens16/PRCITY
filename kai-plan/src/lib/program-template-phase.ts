/**
 * Single source of truth for how we label a session's block phase in charts and history.
 *
 * Protocol templates are named with a trailing "(H)" or "(S)" suffix. We prefer that over
 * denormalized `sessions.phase` / `workout_templates.phase` so a drifted session row still
 * classifies as the same block users see in the UI.
 */
export function chartPhaseFromTemplate(
  template: { name: string; phase: string } | null | undefined,
  sessionPhaseFallback: string
): string {
  if (!template) return (sessionPhaseFallback ?? "").trim();
  const name = (template.name ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .trim();
  const m = name.match(/\(([HS])\)\s*$/i);
  if (m) return m[1].toUpperCase() === "S" ? "Strength" : "Hypertrophy";
  const p = (template.phase ?? "").trim();
  if (p) return p;
  return (sessionPhaseFallback ?? "").trim();
}
