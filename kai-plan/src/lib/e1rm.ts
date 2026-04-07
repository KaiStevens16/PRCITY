/** Epley estimated 1RM from one set */
export function epley1Rm(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function formatWeight(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
