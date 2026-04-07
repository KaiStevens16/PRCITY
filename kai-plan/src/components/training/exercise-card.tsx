"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LastTimePanel } from "@/components/training/last-time-panel";
import { SetLogTable } from "@/components/training/set-log-table";
import { RunWarmupSetLog } from "@/components/training/run-warmup-set-log";
import { isRunWarmupExercise } from "@/lib/run-warmup";
import { SubstitutionModal } from "@/components/training/substitution-modal";
import type { LastSetPerformanceRow, SessionExercise, SetLog } from "@/types/database";
import { phaseStripeClass } from "@/lib/rotation";
import { updateSessionExercise } from "@/app/actions/training";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  phase: string;
  index: number;
  sessionExercise: SessionExercise;
  sets: SetLog[];
  lastTime: LastSetPerformanceRow[];
  targetLabel: string;
  restLabel: string;
  intensityNote: string | null;
};

export function ExerciseCard({
  phase,
  index,
  sessionExercise,
  sets,
  lastTime,
  targetLabel,
  restLabel,
  intensityNote,
}: Props) {
  const router = useRouter();
  const [subOpen, setSubOpen] = useState(false);
  const [expanded, setExpanded] = useState(!sessionExercise.completed);

  const stripe = phaseStripeClass(phase);
  const runWarmup =
    isRunWarmupExercise(sessionExercise.planned_exercise_name) ||
    isRunWarmupExercise(sessionExercise.actual_exercise_name);

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-card/90 shadow-card transition-shadow hover:shadow-card-lg",
        stripe,
        sessionExercise.completed && "opacity-[0.97]"
      )}
    >
      <CardHeader className="space-y-0 pb-0 pt-0">
        <div className="flex gap-0">
          <div className="flex w-11 shrink-0 flex-col items-center justify-start border-r border-border/40 bg-muted/20 py-4">
            <span className="font-mono text-lg font-bold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-3 p-4 pl-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
                    {sessionExercise.actual_exercise_name}
                  </h3>
                  {sessionExercise.is_substitution && (
                    <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wide">
                      Swap
                    </Badge>
                  )}
                </div>
                {sessionExercise.planned_exercise_name !==
                  sessionExercise.actual_exercise_name && (
                  <p className="text-xs text-muted-foreground">
                    Programmed:{" "}
                    <span className="text-foreground/80">
                      {sessionExercise.planned_exercise_name}
                    </span>
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/70">{targetLabel}</span>
                  <span className="mx-1.5 text-border">·</span>
                  rest {restLabel}
                  {intensityNote ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      {intensityNote}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded((e) => !e)}
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 border-border/70"
                  onClick={() => setSubOpen(true)}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Swap
                </Button>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/30">
                  <Checkbox
                    className="border-border/80"
                    checked={sessionExercise.completed}
                    onCheckedChange={(c) => {
                      void updateSessionExercise({
                        id: sessionExercise.id,
                        completed: c === true,
                      }).then(() => router.refresh());
                    }}
                  />
                  Done
                </label>
              </div>
            </div>
            <LastTimePanel rows={lastTime} mode={runWarmup ? "run" : "default"} />
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 border-t border-border/40 bg-background/20 px-4 pb-5 pt-4 sm:pl-[calc(2.75rem+1rem)]">
          {runWarmup ? <RunWarmupSetLog sets={sets} /> : <SetLogTable sets={sets} />}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Exercise notes
            </p>
            <Textarea
              className="min-h-[56px] resize-y border-border/60 bg-card/60 text-sm"
              defaultValue={sessionExercise.exercise_notes ?? ""}
              placeholder="Grip, machine, pain, tempo…"
              onBlur={(e) => {
                void updateSessionExercise({
                  id: sessionExercise.id,
                  exerciseNotes: e.target.value || null,
                }).then(() => router.refresh());
              }}
            />
          </div>
        </CardContent>
      )}
      <SubstitutionModal
        open={subOpen}
        onOpenChange={setSubOpen}
        sessionExerciseId={sessionExercise.id}
        plannedName={sessionExercise.planned_exercise_name}
        currentActual={sessionExercise.actual_exercise_name}
      />
    </Card>
  );
}
