import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LastTimePanel } from "@/components/training/last-time-panel";
import type { LastSetPerformanceRow, TemplateExercise } from "@/types/database";
import { phaseStripeClass } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import { isRunWarmupExercise } from "@/lib/run-warmup";

type Props = {
  exercise: TemplateExercise;
  phase: string;
  index: number;
  lastTime: LastSetPerformanceRow[];
};

export function PlannedExerciseCard({ exercise, phase, index, lastTime }: Props) {
  const targetLabel = `${exercise.target_sets} × ${exercise.rep_min}–${exercise.rep_max}`;
  const restLabel =
    exercise.rest_seconds >= 60
      ? `${Math.round(exercise.rest_seconds / 60)} min`
      : `${exercise.rest_seconds}s`;

  const stripe = phaseStripeClass(phase);
  const runWarmup =
    isRunWarmupExercise(exercise.exercise_name) &&
    (exercise.exercise_group ?? "").toLowerCase() === "warm-up";

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-card/60 shadow-card",
        stripe
      )}
    >
      <CardHeader className="flex flex-row gap-0 space-y-0 p-0">
        <div className="flex w-11 shrink-0 flex-col items-center border-r border-border/40 bg-muted/15 py-4">
          <span className="font-mono text-lg font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2 p-4">
          <h3 className="text-lg font-semibold leading-tight tracking-tight">
            {exercise.exercise_name}
          </h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {runWarmup ? (
              <span>
                Log{" "}
                <span className="font-medium text-foreground/80">
                  miles, minutes, and average mph
                </span>{" "}
                once you start — any two fields infer the third.
              </span>
            ) : (
              <>
                <span className="font-medium text-foreground/70">{targetLabel}</span>
                <span className="mx-1.5">·</span>
                rest {restLabel}
                {exercise.intensity_note ? (
                  <>
                    <span className="mx-1.5">·</span>
                    {exercise.intensity_note}
                  </>
                ) : null}
              </>
            )}
          </p>
          <LastTimePanel rows={lastTime} mode={runWarmup ? "run" : "default"} />
        </div>
      </CardHeader>
      <CardContent className="border-t border-border/30 bg-background/15 px-4 py-3 sm:pl-[calc(2.75rem+1rem)]">
        <p className="text-[11px] text-muted-foreground">
          {runWarmup
            ? "After you start, use the run warm-up row for distance / time / pace."
            : "Start the session below to log sets — numbers save as you type."}
        </p>
      </CardContent>
    </Card>
  );
}
