"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  addSessionCardio,
  completeSession,
  startSession,
  updateSessionFields,
  quickCompleteRestDay,
} from "@/app/actions/training";
import { phaseAccentClass, phaseBadgeVariant } from "@/lib/rotation";
import { parseWarmupChecklist } from "@/lib/warmup-checklist";
import { WarmupChecklistPanel } from "@/components/training/warmup-checklist-panel";
import type { Session, WorkoutTemplate } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEffect, useState, useTransition } from "react";
import { HistoryDeleteSessionDialog } from "@/components/history/history-delete-session-dialog";
import { Play, CheckCircle2, CloudAlert, XCircle } from "lucide-react";

type Props = {
  template: WorkoutTemplate;
  session: Session | null;
  isLightDay: boolean;
  programPreworkoutNote?: string | null;
  /** Exercises completed / total (in-progress sessions only) */
  sessionProgress?: { done: number; total: number } | null;
  /** Hide Add Run/Bike when session already has cardio */
  hasCardio?: boolean;
};

export function WorkoutHeader({
  template,
  session,
  isLightDay,
  programPreworkoutNote,
  sessionProgress,
  hasCardio = false,
}: Props) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [weirdOpen, setWeirdOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [weirdNotes, setWeirdNotes] = useState(
    session?.weird_day_notes ?? ""
  );
  const [cardioPickOpen, setCardioPickOpen] = useState(false);
  const [cardioAddedLocally, setCardioAddedLocally] = useState(false);
  const [, startCardioTransition] = useTransition();

  const [starting, setStarting] = useState(false);
  const [, startSessionTransition] = useTransition();

  useEffect(() => {
    setWeirdNotes(session?.weird_day_notes ?? "");
    if (hasCardio) setCardioAddedLocally(false);
  }, [session?.id, session?.weird_day_notes, hasCardio]);

  const accent = phaseAccentClass(template.phase);
  const pct =
    sessionProgress && sessionProgress.total > 0
      ? Math.round((sessionProgress.done / sessionProgress.total) * 100)
      : 0;

  function onStart() {
    setStarting(true);
    startSessionTransition(async () => {
      const r = await startSession(template.id);
      if (r && typeof r === "object" && "error" in r && r.error && !("sessionId" in r && r.sessionId)) {
        setStarting(false);
        return;
      }
      router.refresh();
    });
  }

  async function onFinish() {
    if (!session) return;
    setFinishing(true);
    await completeSession({
      sessionId: session.id,
    });
    setFinishing(false);
    setSummaryOpen(true);
  }

  async function onQuickRest() {
    await quickCompleteRestDay(template.id);
    router.refresh();
  }

  async function onAddCardio(modality: "Run" | "Bike") {
    if (!session) return;
    setCardioPickOpen(false);
    setCardioAddedLocally(true);
    startCardioTransition(async () => {
      const r = await addSessionCardio({ sessionId: session.id, modality });
      if (r && "error" in r && r.error) {
        setCardioAddedLocally(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-8 border-b border-border/50 bg-background/90 px-4 pb-5 pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>
                {template.phase}
              </p>
              <span className="text-border">·</span>
              <Badge variant={phaseBadgeVariant(template.phase)} className="text-[10px] font-medium">
                {template.split}
              </Badge>
              <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
                ~{template.estimated_duration_minutes} min
              </Badge>
            </div>
            <h1 className="text-balance text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              {template.name}
            </h1>
            {session?.status === "in_progress" && sessionProgress && sessionProgress.total > 0 && (
              <div className="max-w-md space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Session progress</span>
                  <span className="tabular-nums">
                    {sessionProgress.done}/{sessionProgress.total} lifts
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--phase-hypertrophy)/0.85)] to-[hsl(var(--phase-strength)/0.85)] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!session && !isLightDay && (
              <Button
                size="lg"
                className="gap-2 shadow-md"
                disabled={starting}
                onClick={onStart}
              >
                <Play className="h-4 w-4 fill-current" />
                {starting ? "Starting…" : "Start session"}
              </Button>
            )}
            {isLightDay && !session && (
              <>
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                  disabled={starting}
                  onClick={onStart}
                >
                  {starting ? "Starting…" : "Log session"}
                </Button>
                <Button size="lg" variant="outline" onClick={onQuickRest}>
                  Mark done
                </Button>
              </>
            )}
            {session?.status === "in_progress" && (
              <>
                <Button
                  size="lg"
                  variant={session.weird_day ? "secondary" : "outline"}
                  className={
                    session.weird_day
                      ? "gap-2 border-amber-500/40 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "gap-2 border-border/60"
                  }
                  onClick={() => setWeirdOpen(true)}
                >
                  <CloudAlert className="h-4 w-4 shrink-0" />
                  Weird day
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-destructive/35 text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  Cancel workout
                </Button>
                <Button
                  size="lg"
                  className="gap-2 shadow-md"
                  disabled={finishing}
                  onClick={onFinish}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {finishing ? "Saving…" : "Finish"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 space-y-4">
        {programPreworkoutNote ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-50/80 p-4 text-sm leading-relaxed">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Pre-workout fuel
            </p>
            <p className="mt-2 text-foreground/90">{programPreworkoutNote}</p>
          </div>
        ) : null}

        {template.warmup_note ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm leading-relaxed">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Session note
            </p>
            <p className="mt-2 text-foreground/90">{template.warmup_note}</p>
          </div>
        ) : null}

        {session?.status === "in_progress" ? (
          <>
            {!hasCardio && !cardioAddedLocally ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                {!cardioPickOpen ? (
                  <button
                    type="button"
                    className="text-sm text-foreground/90 underline-offset-2 hover:underline"
                    onClick={() => setCardioPickOpen(true)}
                  >
                    Add Run/Bike
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Add:</span>
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => void onAddCardio("Run")}
                    >
                      Run
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => void onAddCardio("Bike")}
                    >
                      Bike
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setCardioPickOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : null}
            <WarmupChecklistPanel
              sessionId={session.id}
              checklist={parseWarmupChecklist(session.warmup_checklist)}
            />
          </>
        ) : null}
      </div>

      {session?.status === "in_progress" ? (
        <HistoryDeleteSessionDialog
          sessionId={session.id}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          deleteRedirectTo="/today"
          title="Cancel this workout?"
          description="This discards the in-progress session and any sets you've logged. Rotation won't advance."
          confirmLabel="Discard workout"
          dismissLabel="Keep going"
        />
      ) : null}

      <Dialog open={weirdOpen} onOpenChange={setWeirdOpen}>
        <DialogContent className="border-border/80 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CloudAlert className="h-5 w-5 text-amber-400" />
              Weird day
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Log what got in the way (injury, time, energy, etc.). This session shows{" "}
            <span className="text-amber-200/90">amber</span> on your command center; normal sessions
            are <span className="text-emerald-200/90">green</span>.
          </p>
          <Textarea
            value={weirdNotes}
            onChange={(e) => setWeirdNotes(e.target.value)}
            placeholder="e.g. Adductor flared up — stopped after squats."
            className="min-h-[100px] resize-y border-border/60 bg-background/50 text-sm"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                void updateSessionFields({
                  sessionId: session!.id,
                  weirdDay: false,
                  weirdDayNotes: null,
                }).then(() => {
                  setWeirdNotes("");
                  setWeirdOpen(false);
                  router.refresh();
                });
              }}
            >
              Clear — normal day
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="secondary" onClick={() => setWeirdOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={() => {
                  void updateSessionFields({
                    sessionId: session!.id,
                    weirdDay: true,
                    weirdDayNotes: weirdNotes.trim() || null,
                  }).then(() => {
                    setWeirdOpen(false);
                    router.refresh();
                  });
                }}
              >
                Save weird day
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="border-border/80 bg-card text-center">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              Session logged
            </DialogTitle>
          </DialogHeader>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            Rotation advanced. You&apos;re building the paper trail — check History for the full picture.
          </p>
          <DialogFooter className="w-full flex-col items-center justify-center gap-2 sm:flex-col sm:justify-center">
            <Button
              className="w-full max-w-xs"
              onClick={() => {
                setSummaryOpen(false);
                router.push("/");
              }}
            >
              Command Center
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
