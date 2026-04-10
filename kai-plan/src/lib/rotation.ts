import type { WorkoutTemplate } from "@/types/database";

export const ROTATION_LENGTH = 8;

/** 0-based index → rotation_order on template (1–8) */
export function rotationOrderFromIndex(index: number): number {
  const n = ((index % ROTATION_LENGTH) + ROTATION_LENGTH) % ROTATION_LENGTH;
  return n + 1;
}

export function nextRotationIndex(current: number): number {
  return (current + 1) % ROTATION_LENGTH;
}

/** Map `workout_templates.rotation_order` (1–8) to the 0-based index used in `program_state`. */
export function rotationIndexFromOrder(rotationOrder: number): number {
  const o = Math.round(rotationOrder);
  if (!Number.isFinite(o)) return 0;
  const zero = (((o - 1) % ROTATION_LENGTH) + ROTATION_LENGTH) % ROTATION_LENGTH;
  return zero;
}

/** After completing a session for a template, the next scheduled slot in the cycle. */
export function nextRotationIndexAfterTemplate(rotationOrder: number | null | undefined): number {
  if (rotationOrder == null || !Number.isFinite(rotationOrder)) {
    return nextRotationIndex(0);
  }
  return nextRotationIndex(rotationIndexFromOrder(rotationOrder));
}

export function prevRotationIndex(current: number): number {
  return (current - 1 + ROTATION_LENGTH) % ROTATION_LENGTH;
}

export function templateForIndex(
  templates: WorkoutTemplate[],
  rotationIndex: number
): WorkoutTemplate | undefined {
  const order = rotationOrderFromIndex(rotationIndex);
  return templates.find((t) => t.rotation_order === order);
}

/** Pick a template for Today: `workoutQuery` overrides rotation when it matches an active template id */
export function resolveTodayWorkoutPick(
  templates: WorkoutTemplate[],
  rotationIndex: number,
  workoutQueryId: string | null | undefined
): { template: WorkoutTemplate | undefined; recommended: WorkoutTemplate | undefined } {
  const recommended = templateForIndex(templates, rotationIndex);
  const q = workoutQueryId?.trim();
  if (q) {
    const picked = templates.find((t) => t.id === q);
    if (picked) return { template: picked, recommended };
  }
  return { template: recommended, recommended };
}

export function upcomingTemplates(
  templates: WorkoutTemplate[],
  currentRotationIndex: number,
  count: number
): WorkoutTemplate[] {
  const sorted = [...templates].sort(
    (a, b) => a.rotation_order - b.rotation_order
  );
  const out: WorkoutTemplate[] = [];
  for (let i = 1; i <= count; i++) {
    const idx = (currentRotationIndex + i) % ROTATION_LENGTH;
    const t = templateForIndex(sorted, idx);
    if (t) out.push(t);
  }
  return out;
}

export function phaseAccentClass(phase: string): string {
  const p = phase.toLowerCase();
  if (p.includes("hypertrophy")) return "text-[hsl(var(--phase-hypertrophy))]";
  if (p.includes("strength")) return "text-[hsl(var(--phase-strength))]";
  if (p.includes("recovery")) return "text-[hsl(var(--phase-recovery))]";
  if (p.includes("rest")) return "text-[hsl(var(--phase-rest))]";
  return "text-muted-foreground";
}

/** Left accent stripe on training cards */
export function phaseStripeClass(phase: string): string {
  const p = phase.toLowerCase();
  if (p.includes("hypertrophy"))
    return "border-l-[3px] border-l-[hsl(var(--phase-hypertrophy))]";
  if (p.includes("strength"))
    return "border-l-[3px] border-l-[hsl(var(--phase-strength))]";
  if (p.includes("recovery"))
    return "border-l-[3px] border-l-[hsl(var(--phase-recovery))]";
  if (p.includes("rest"))
    return "border-l-[3px] border-l-[hsl(var(--phase-rest))]";
  return "border-l-[3px] border-l-border";
}

export function phaseBadgeVariant(
  phase: string
): "hypertrophy" | "strength" | "recovery" | "rest" | "secondary" {
  const p = phase.toLowerCase();
  if (p.includes("hypertrophy")) return "hypertrophy";
  if (p.includes("strength")) return "strength";
  if (p.includes("recovery")) return "recovery";
  if (p.includes("rest")) return "rest";
  return "secondary";
}
