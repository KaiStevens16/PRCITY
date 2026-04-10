"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LastTimePanel } from "@/components/training/last-time-panel";
import { SetLogTable } from "@/components/training/set-log-table";
import { RunWarmupSetLog } from "@/components/training/run-warmup-set-log";
import { isRunWarmupExercise } from "@/lib/run-warmup";
import { SubstitutionModal } from "@/components/training/substitution-modal";
import type { LastSetPerformanceRow, SessionExercise, SetLog } from "@/types/database";
import { phaseStripeClass } from "@/lib/rotation";
import { addSessionExerciseAfter, updateSessionExercise } from "@/app/actions/training";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, CloudAlert, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  phase: string;
  index: number;
  sessionId: string;
  afterOrderIndex: number;
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
  sessionId,
  afterOrderIndex,
  sessionExercise,
  sets,
  lastTime,
  targetLabel,
  restLabel,
  intensityNote,
}: Props) {
  const router = useRouter();
  const [pendingAdd, startAddTransition] = useTransition();
  const [subOpen, setSubOpen] = useState(false);
  const [weirdOpen, setWeirdOpen] = useState(false);
  const [addLiftOpen, setAddLiftOpen] = useState(false);
  const [newLiftName, setNewLiftName] = useState("");
  const [weirdNotes, setWeirdNotes] = useState(sessionExercise.weird_exercise_notes ?? "");
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
          <div className="flex w-11 shrink-0 flex-col items-center justify-start gap-2 border-r border-border/40 bg-muted/20 py-4">
            <span className="font-mono text-lg font-bold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="min-w-0 flex-1 space-y-3 p-4 pl-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-tight md:text-xl">
                    {sessionExercise.actual_exercise_name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 border-border/70 px-2"
                      onClick={() => setSubOpen(true)}
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      Swap/Remove
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={sessionExercise.weird_exercise ? "secondary" : "outline"}
                      className={
                        sessionExercise.weird_exercise
                          ? "h-7 gap-1 border-amber-500/40 bg-amber-500/15 px-2 text-amber-100 hover:bg-amber-500/25"
                          : "h-7 gap-1 border-border/70 px-2"
                      }
                      onClick={() => {
                        setWeirdNotes(sessionExercise.weird_exercise_notes ?? "");
                        setWeirdOpen(true);
                      }}
                    >
                      <CloudAlert className="h-3.5 w-3.5" />
                      Weird
                    </Button>
                  </div>
                  {sessionExercise.is_substitution && (
                    <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wide">
                      Swap
                    </Badge>
                  )}
                  {sessionExercise.weird_exercise && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-[9px] font-semibold uppercase tracking-wide text-amber-300"
                    >
                      Weird
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
            </div>
            <LastTimePanel rows={lastTime} mode={runWarmup ? "run" : "default"} />
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                disabled={pendingAdd}
                onClick={() => {
                  setNewLiftName("");
                  setAddLiftOpen(true);
                }}
              >
                + Add lift below
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 border-t border-border/40 bg-background/20 px-4 pb-5 pt-4 sm:pl-[calc(2.75rem+1rem)]">
          {runWarmup ? (
            <RunWarmupSetLog sets={sets} />
          ) : (
            <SetLogTable sessionExerciseId={sessionExercise.id} sets={sets} />
          )}
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
      <Dialog open={addLiftOpen} onOpenChange={setAddLiftOpen}>
        <DialogContent className="border-border/80 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add lift below</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Adds a new exercise to this session only (does not change your protocol).
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-lift-name">Exercise name</Label>
            <Input
              id="new-lift-name"
              value={newLiftName}
              onChange={(e) => setNewLiftName(e.target.value)}
              placeholder="e.g. Goblet squat"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setAddLiftOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pendingAdd || !newLiftName.trim()}
              onClick={() => {
                startAddTransition(async () => {
                  const r = await addSessionExerciseAfter({
                    sessionId,
                    afterOrderIndex,
                    exerciseName: newLiftName.trim(),
                  });
                  if (r && "error" in r && r.error) {
                    window.alert(r.error);
                    return;
                  }
                  setAddLiftOpen(false);
                  setNewLiftName("");
                  router.refresh();
                });
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={weirdOpen} onOpenChange={setWeirdOpen}>
        <DialogContent className="border-border/80 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CloudAlert className="h-5 w-5 text-amber-400" />
              Weird lift
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark this lift as weird (pain, fatigue, machine taken, etc.) without flagging the entire day.
          </p>
          <Textarea
            value={weirdNotes}
            onChange={(e) => setWeirdNotes(e.target.value)}
            placeholder="e.g. Leg press stopped after set 3 because knee pain."
            className="min-h-[100px] resize-y border-border/60 bg-background/50 text-sm"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                void updateSessionExercise({
                  id: sessionExercise.id,
                  weirdExercise: false,
                  weirdExerciseNotes: null,
                }).then(() => {
                  setWeirdOpen(false);
                  router.refresh();
                });
              }}
            >
              Clear weird flag
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="secondary" onClick={() => setWeirdOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={() => {
                  void updateSessionExercise({
                    id: sessionExercise.id,
                    weirdExercise: true,
                    weirdExerciseNotes: weirdNotes.trim() || null,
                  }).then(() => {
                    setWeirdOpen(false);
                    router.refresh();
                  });
                }}
              >
                Save weird lift
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
