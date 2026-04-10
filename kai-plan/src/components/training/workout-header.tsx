"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  completeSession,
  startSession,
  updateSessionFields,
  quickCompleteRestDay,
} from "@/app/actions/training";
import { phaseAccentClass, phaseBadgeVariant } from "@/lib/rotation";
import type { Session, WorkoutTemplate } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Play, CheckCircle2, CloudAlert } from "lucide-react";

type Props = {
  template: WorkoutTemplate;
  session: Session | null;
  isLightDay: boolean;
  /** Exercises completed / total (in-progress sessions only) */
  sessionProgress?: { done: number; total: number } | null;
};

export function WorkoutHeader({
  template,
  session,
  isLightDay,
  sessionProgress,
}: Props) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(
    session?.session_notes ?? ""
  );
  const [weirdOpen, setWeirdOpen] = useState(false);
  const [weirdNotes, setWeirdNotes] = useState(
    session?.weird_day_notes ?? ""
  );

  useEffect(() => {
    setSessionNotes(session?.session_notes ?? "");
    setWeirdNotes(session?.weird_day_notes ?? "");
  }, [session?.id, session?.session_notes, session?.weird_day_notes]);

  const accent = phaseAccentClass(template.phase);
  const pct =
    sessionProgress && sessionProgress.total > 0
      ? Math.round((sessionProgress.done / sessionProgress.total) * 100)
      : 0;

  async function onStart() {
    const r = await startSession(template.id);
    if (r && typeof r === "object" && "sessionId" in r && r.sessionId) {
      router.refresh();
      return;
    }
    if (r && typeof r === "object" && "error" in r && r.error) return;
    router.refresh();
  }

  async function onFinish() {
    if (!session) return;
    setFinishing(true);
    await completeSession({
      sessionId: session.id,
      sessionNotes: sessionNotes || undefined,
    });
    setFinishing(false);
    setSummaryOpen(true);
  }

  async function onQuickRest() {
    await quickCompleteRestDay(template.id);
    router.refresh();
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
              <Button size="lg" className="gap-2 shadow-lg shadow-black/20" onClick={onStart}>
                <Play className="h-4 w-4 fill-current" />
                Start session
              </Button>
            )}
            {isLightDay && !session && (
              <>
                <Button size="lg" variant="secondary" className="gap-2" onClick={onStart}>
                  Log session
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
                      ? "gap-2 border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
                      : "gap-2 border-border/60"
                  }
                  onClick={() => setWeirdOpen(true)}
                >
                  <CloudAlert className="h-4 w-4 shrink-0" />
                  Weird day
                </Button>
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-black/25"
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
        {template.warmup_note && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm leading-relaxed">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Warm-up
            </p>
            <p className="mt-2 text-foreground/90">{template.warmup_note}</p>
          </div>
        )}

        {session?.status === "in_progress" && (
          <div className="grid gap-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:grid-cols-2">
            <Label className="flex cursor-pointer items-center gap-3 text-sm font-normal">
              <Checkbox
                className="border-border/80"
                checked={session.preworkout_done ?? false}
                onCheckedChange={(c) => {
                  void updateSessionFields({
                    sessionId: session.id,
                    preworkoutDone: c === true,
                  }).then(() => router.refresh());
                }}
              />
              Pre-workout checklist done
            </Label>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Session notes
              </p>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                onBlur={() =>
                  updateSessionFields({
                    sessionId: session.id,
                    sessionNotes: sessionNotes || null,
                  }).then(() => router.refresh())
                }
                placeholder="Anything global for this session…"
                className="min-h-[72px] resize-y border-border/60 bg-background/50 text-sm"
              />
            </div>
          </div>
        )}
      </div>

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
                router.refresh();
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
