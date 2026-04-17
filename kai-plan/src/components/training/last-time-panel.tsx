import { formatWeight } from "@/lib/e1rm";
import { isBodyweightNote, isBodyweightSet } from "@/lib/bw-set";
import { formatLongDate } from "@/lib/date";
import type { LastSetPerformanceRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { formatLastTimeRunRows } from "@/lib/run-warmup";

type Props = {
  rows: LastSetPerformanceRow[];
  className?: string;
  mode?: "default" | "run";
};

/**
 * Show "bw×reps" when set_note marks bw, or when weight is null with reps and
 * we can infer BW: all sets are unweighted reps, or this set is strictly before
 * the first plate-weight set (warm-up pull-ups then added weight).
 */
function showAsBodyweightLastTime(rows: LastSetPerformanceRow[], r: LastSetPerformanceRow): boolean {
  if (r.reps == null) return false;
  if (isBodyweightNote(r.set_note)) return true;
  if (isBodyweightSet(r.weight, r.set_note)) return true;
  if (r.weight != null) return false;

  const ordered = [...rows].sort((a, b) => a.set_number - b.set_number);
  const firstWeighted = ordered.find((x) => x.weight != null && x.reps != null);

  if (firstWeighted != null) {
    return r.set_number < firstWeighted.set_number;
  }

  return ordered.every((x) => x.weight == null && x.reps != null);
}

export function LastTimePanel({ rows, className, mode = "default" }: Props) {
  if (!rows.length) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-2.5 text-[11px] text-muted-foreground",
          className
        )}
      >
        No prior log for this slot — first time through or new rotation.
      </div>
    );
  }

  const date = rows[0]?.session_date;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-gradient-to-br from-muted/25 to-transparent px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-[hsl(var(--phase-strength)/0.9)]" />
        Last time
        {date ? (
          <span className="font-normal normal-case tracking-normal text-foreground/70">
            · {formatLongDate(date)}
          </span>
        ) : null}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm tabular-nums text-foreground/90">
        {mode === "run"
          ? (() => {
              const line = formatLastTimeRunRows(rows);
              return (
                <li>
                  {line ? (
                    <span>{line}</span>
                  ) : (
                    <span className="text-muted-foreground/80">No logged run —</span>
                  )}
                </li>
              );
            })()
          : rows.map((r) => (
              <li key={r.set_number}>
                {r.reps != null && showAsBodyweightLastTime(rows, r) ? (
                  <span>
                    bw×{r.reps}
                    {r.rpe != null ? (
                      <span className="text-xs text-muted-foreground"> @{r.rpe}</span>
                    ) : null}
                  </span>
                ) : r.weight != null && r.reps != null && !isBodyweightNote(r.set_note) ? (
                  <span>
                    {formatWeight(Number(r.weight))}×{r.reps}
                    {r.rpe != null ? (
                      <span className="text-xs text-muted-foreground"> @{r.rpe}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground/80">S{r.set_number} —</span>
                )}
              </li>
            ))}
      </ul>
    </div>
  );
}
