"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getHistorySessionWorkout,
  type HistoryWorkoutBlock,
  type HistoryWorkoutSet,
} from "@/app/actions/history-workout";
import {
  updateRunWarmupSetLog,
  updateSetLog,
  updateSessionFields,
} from "@/app/actions/training";
import {
  BW_SET_NOTE,
  formatLiftLineForDisplay,
  isBodyweightNote,
  parseWeightInput,
  weightDraftFromSet,
} from "@/lib/bw-set";
import {
  formatRunHumanLine,
  parseRunWarmupDraft,
  reconcileRunWarmupTriplet,
} from "@/lib/run-warmup";
import { cn } from "@/lib/utils";

type Props = {
  sessionId: string;
  editable: boolean;
  initialBlocks?: HistoryWorkoutBlock[];
  /** Show link to full session page (hide when already on that page). */
  showSessionPageLink?: boolean;
  /** Omit top border when already inside a bordered card. */
  embedded?: boolean;
  /** Session-level notes (e.g. from History row expand). */
  sessionNotes?: string | null;
};

function HistorySessionNoteSection({
  sessionId,
  sessionNotes,
  editable,
  onSaved,
}: {
  sessionId: string;
  sessionNotes: string | null | undefined;
  editable: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(sessionNotes ?? "");

  useEffect(() => {
    setDraft(sessionNotes ?? "");
  }, [sessionNotes]);

  const flush = async () => {
    if (!editable) return;
    const empty = draft.trim() === "";
    const prevEmpty = !(sessionNotes ?? "").trim();
    if (empty && prevEmpty) return;
    if (!empty && draft === (sessionNotes ?? "")) return;
    const r = await updateSessionFields({
      sessionId,
      sessionNotes: empty ? null : draft,
    });
    if (r && "error" in r && r.error) return;
    onSaved();
  };

  return (
    <div className="mb-4 rounded-lg border border-border/40 bg-muted/10 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add a note
      </p>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void flush()}
        disabled={!editable}
        placeholder="Anything about this session — how it felt, context for next time…"
        className="mt-2 min-h-[80px] resize-y border-border/60 bg-background/50 text-sm text-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

export function HistoryWorkoutSimple({
  sessionId,
  editable,
  initialBlocks,
  showSessionPageLink = true,
  embedded = false,
  sessionNotes,
}: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<HistoryWorkoutBlock[] | null>(
    initialBlocks ?? null
  );
  const [loading, setLoading] = useState(!initialBlocks);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await getHistorySessionWorkout(sessionId);
    if (!r.ok) {
      setErr(r.error);
      setBlocks([]);
    } else {
      setBlocks(r.blocks);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (initialBlocks) {
      setBlocks(initialBlocks);
      setLoading(false);
      return;
    }
    void load();
  }, [initialBlocks, load]);

  const refresh = () => {
    void load();
    router.refresh();
  };

  const noteSection = (
    <HistorySessionNoteSection
      sessionId={sessionId}
      sessionNotes={sessionNotes}
      editable={editable}
      onSaved={refresh}
    />
  );

  if (loading) {
    return (
      <div className="min-w-0 max-w-full px-3 py-4 sm:px-4">
        {noteSection}
        <div className="text-sm text-muted-foreground">Loading workout…</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-w-0 max-w-full px-3 py-4 sm:px-4">
        {noteSection}
        <div className="text-sm text-amber-200/90">{err}</div>
      </div>
    );
  }
  if (!blocks?.length) {
    return (
      <div className="min-w-0 max-w-full px-3 py-4 sm:px-4">
        {noteSection}
        <div className="text-sm text-muted-foreground">No exercises logged.</div>
      </div>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div
      className={cn(
        "min-w-0 max-w-full bg-background/20 px-3 py-4 sm:px-4",
        !embedded && "border-t border-border/40"
      )}
    >
      {!embedded && (
        <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workout log
          </p>
          {showSessionPageLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto min-h-7 w-full justify-center whitespace-normal px-2 py-1.5 text-center text-xs leading-snug sm:h-7 sm:w-auto sm:justify-center sm:whitespace-nowrap sm:py-0"
              asChild
            >
              <Link href={`/history/session/${sessionId}`}>Open session page</Link>
            </Button>
          )}
        </div>
      )}
      {noteSection}
      <div className="space-y-0 font-sans text-sm leading-relaxed text-foreground/95">
        {blocks.map((block, bi) => {
          const g = block.exerciseGroup?.trim() || null;
          const showGroup = g && g !== lastGroup;
          if (g) lastGroup = g;

          return (
            <div key={block.sessionExerciseId}>
              {showGroup && (
                <p
                  className={cn(
                    "font-semibold capitalize tracking-tight text-foreground",
                    bi > 0 && "mt-5"
                  )}
                >
                  {g}
                </p>
              )}
              <div className={cn(showGroup && "mt-2")}>
                <p className="font-medium text-foreground/95">{block.title}</p>
                <div className="mt-1.5 space-y-1 pl-0">
                  {block.isRunWarmup ? (
                    block.sets.map((s) => (
                      <HistoryRunSetRow
                        key={s.id}
                        set={s}
                        editable={editable}
                        onSaved={refresh}
                      />
                    ))
                  ) : (
                    block.sets.map((s) => (
                      <HistoryLiftSetRow
                        key={s.id}
                        set={s}
                        editable={editable}
                        onSaved={refresh}
                      />
                    ))
                  )}
                </div>
              </div>
              {bi < blocks.length - 1 && (
                <hr className="my-4 border-border/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryLiftSetRow({
  set,
  editable,
  onSaved,
}: {
  set: HistoryWorkoutSet;
  editable: boolean;
  onSaved: () => void;
}) {
  const [w, setW] = useState(weightDraftFromSet(set.weight, set.setNote));
  const [r, setR] = useState(set.reps != null ? String(set.reps) : "");

  useEffect(() => {
    setW(weightDraftFromSet(set.weight, set.setNote));
    setR(set.reps != null ? String(set.reps) : "");
  }, [set.id, set.weight, set.reps, set.setNote]);

  const save = async () => {
    const rv = r.trim() === "" ? null : parseInt(r, 10);
    const reps = rv == null || Number.isNaN(rv) ? null : rv;
    const parsed = parseWeightInput(w);
    const note = set.setNote ?? null;
    if (parsed.kind === "bw") {
      await updateSetLog({
        id: set.id,
        weight: null,
        setNote: BW_SET_NOTE,
        reps,
      });
    } else if (parsed.kind === "clear") {
      const noteAfter = isBodyweightNote(note) ? null : note;
      await updateSetLog({
        id: set.id,
        weight: null,
        setNote: noteAfter,
        reps,
      });
    } else {
      let noteAfter: string | null = note;
      if (isBodyweightNote(note)) noteAfter = null;
      await updateSetLog({
        id: set.id,
        weight: parsed.value,
        setNote: noteAfter,
        reps,
      });
    }
    onSaved();
  };

  if (!editable) {
    const line = formatLiftLineForDisplay(
      set.weight,
      set.reps,
      set.setNote,
      set.completed
    );
    return <p className="font-mono text-[13px] tabular-nums text-muted-foreground">{line}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[13px] tabular-nums">
      <Input
        className="h-8 w-[4.5rem] border-border/60 bg-card/80 px-2 text-[13px]"
        value={w}
        onChange={(e) => setW(e.target.value)}
        onBlur={() => void save()}
        inputMode="decimal"
      />
      <span className="text-muted-foreground">for</span>
      <Input
        className="h-8 w-14 border-border/60 bg-card/80 px-2 text-[13px]"
        value={r}
        onChange={(e) => setR(e.target.value)}
        onBlur={() => void save()}
        inputMode="numeric"
      />
    </div>
  );
}

function HistoryRunSetRow({
  set,
  editable,
  onSaved,
}: {
  set: HistoryWorkoutSet;
  editable: boolean;
  onSaved: () => void;
}) {
  const [mi, setMi] = useState(set.weight != null ? String(set.weight) : "");
  const [min, setMin] = useState(set.reps != null ? String(set.reps) : "");
  const draftRef = useRef({ mi: "", min: "" });

  useEffect(() => {
    const mii = set.weight != null ? String(set.weight) : "";
    const mn = set.reps != null ? String(set.reps) : "";
    setMi(mii);
    setMin(mn);
    draftRef.current = { mi: mii, min: mn };
  }, [set.id, set.weight, set.reps]);

  const flush = async () => {
    let p = parseRunWarmupDraft(draftRef.current.mi, draftRef.current.min, "");
    p = reconcileRunWarmupTriplet({ miles: p.miles, minutes: p.minutes, mph: p.mph });
    await updateRunWarmupSetLog({
      setLogId: set.id,
      miles: p.miles,
      minutes: p.minutes,
      mph: p.mph,
    });
    onSaved();
  };

  const onBlurRecalc = async () => {
    let p = parseRunWarmupDraft(draftRef.current.mi, draftRef.current.min, "");
    p = reconcileRunWarmupTriplet(p);
    setMi(p.miles != null ? String(p.miles) : "");
    setMin(p.minutes != null ? String(p.minutes) : "");
    draftRef.current = {
      mi: p.miles != null ? String(p.miles) : "",
      min: p.minutes != null ? String(p.minutes) : "",
    };
    await flush();
  };

  if (!editable) {
    const line = formatRunHumanLine(set.weight, set.reps);
    return <p className="font-mono text-[13px] tabular-nums text-muted-foreground">{line}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[13px] tabular-nums">
      <Input
        className="h-8 w-12 border-border/60 bg-card/80 px-2 text-[13px]"
        placeholder="min"
        value={min}
        onChange={(e) => {
          const v = e.target.value;
          setMin(v);
          draftRef.current = { ...draftRef.current, min: v };
        }}
        onBlur={onBlurRecalc}
        inputMode="numeric"
      />
      <span className="text-muted-foreground">min run /</span>
      <Input
        className="h-8 w-14 border-border/60 bg-card/80 px-2 text-[13px]"
        placeholder="mi"
        value={mi}
        onChange={(e) => {
          const v = e.target.value;
          setMi(v);
          draftRef.current = { ...draftRef.current, mi: v };
        }}
        onBlur={onBlurRecalc}
        inputMode="decimal"
      />
      <span className="text-muted-foreground">mi</span>
    </div>
  );
}
