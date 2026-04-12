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

/** Plain-text export: exercise name, then set lines, separators between exercises. */
export function buildSessionWorkoutExportText(blocks: HistoryWorkoutBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    const setLines: string[] = [];
    for (const s of b.sets) {
      const line = b.isRunWarmup ? formatRunSet(s) : formatStrengthSet(s);
      if (line) setLines.push(line);
    }
    if (!setLines.length) continue;

    parts.push([b.title, ...setLines].join("\n"));
  }
  return parts.join(`\n${SEP}\n`);
}
