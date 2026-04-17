import type { HistoryWorkoutBlock, HistoryWorkoutSet } from "@/app/actions/history-workout";
import { isBodyweightNote } from "@/lib/bw-set";
import { formatWeight } from "@/lib/e1rm";
import { formatRunHumanLine } from "@/lib/run-warmup";

const SEP = "--------";

/** Export lines from logged weight/reps — do not require `completed` (strength UI never toggles it). */
function formatStrengthSet(s: HistoryWorkoutSet): string | null {
  const note = (s.setNote ?? "").trim();
  const isBw = s.weight == null && isBodyweightNote(note);
  const reps = s.reps != null && !Number.isNaN(Number(s.reps)) ? Math.round(Number(s.reps)) : null;
  if (reps == null || reps <= 0) return null;
  let line: string;
  if (isBw) {
    line = `bw for ${reps}`;
  } else if (s.weight != null) {
    line = `${formatWeight(Number(s.weight))} for ${reps}`;
  } else {
    return null;
  }
  if (note && !isBodyweightNote(note)) {
    line += `, ${note}`;
  }
  return line;
}

function formatRunSet(s: HistoryWorkoutSet): string | null {
  const line = formatRunHumanLine(s.weight, s.reps);
  return line === "—" ? null : line;
}

export type SessionWorkoutExportMeta = {
  weirdDay?: boolean;
  weirdDayNotes?: string | null;
};

/** Plain-text export: optional weird-day header, then exercise blocks (with weird-lift notes). */
export function buildSessionWorkoutExportText(
  blocks: HistoryWorkoutBlock[],
  meta?: SessionWorkoutExportMeta
): string {
  const parts: string[] = [];
  if (meta?.weirdDay) {
    parts.push("Weird day");
    const n = (meta.weirdDayNotes ?? "").trim();
    if (n) parts.push(n);
    parts.push("");
  }
  for (const b of blocks) {
    const setLines: string[] = [];
    for (const s of b.sets) {
      const line = b.isRunWarmup ? formatRunSet(s) : formatStrengthSet(s);
      if (line) setLines.push(line);
    }
    if (!setLines.length) continue;

    const titleLine = b.weirdExercise ? `${b.title} (weird lift)` : b.title;
    const blockLines = [titleLine, ...setLines];
    const wn = (b.weirdExerciseNotes ?? "").trim();
    if (b.weirdExercise && wn) blockLines.push(`  Note: ${wn}`);
    parts.push(blockLines.join("\n"));
  }
  return parts.join(`\n${SEP}\n`);
}
