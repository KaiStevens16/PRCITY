/** Bodyweight push-up variants that should open with exactly target_sets (no +1 spare). */
export function isExactTargetSetsExercise(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    n === "incline push-ups (bodyweight)" ||
    n === "flat push-ups (bodyweight)" ||
    n === "decline push-ups (bodyweight)"
  );
}
