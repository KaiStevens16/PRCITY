"use client";

import { useTransition, useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  addSetToSessionExercise,
  removeSetLog,
  updateSetLog,
} from "@/app/actions/training";
import type { SetLog } from "@/types/database";
import {
  BW_SET_NOTE,
  isBodyweightNote,
  noteDraftFromSet,
  parseWeightInput,
  weightDraftFromSet,
} from "@/lib/bw-set";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Props = {
  sessionExerciseId: string;
  sets: SetLog[];
};

type Draft = { w: string; r: string; n: string };

function draftKey(sets: SetLog[]) {
  return sets
    .map((s) => `${s.id}:${s.weight}:${s.reps}:${s.rpe}:${s.set_note}:${s.completed}`)
    .join("|");
}

export function SetLogTable({ sessionExerciseId, sets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syncKey = useRef("");

  useEffect(() => {
    const k = draftKey(sets);
    if (k === syncKey.current) return;
    syncKey.current = k;
    const next: Record<string, Draft> = {};
    for (const s of sets) {
      next[s.id] = {
        w: weightDraftFromSet(s.weight, s.set_note),
        r: s.reps != null ? String(s.reps) : "",
        n: noteDraftFromSet(s.set_note),
      };
    }
    setDraft(next);
  }, [sets]);

  const flushSave = useCallback(
    async (id: string, field: "weight" | "reps" | "set_note", raw: string) => {
      const current = sets.find((s) => s.id === id);
      const currentNote = current?.set_note ?? null;
      if (field === "set_note") {
        const t = raw.trim();
        if (t === "") {
          await updateSetLog({ id, setNote: null });
        } else if (t.toLowerCase() === BW_SET_NOTE) {
          await updateSetLog({ id, weight: null, setNote: BW_SET_NOTE });
        } else {
          await updateSetLog({ id, setNote: t });
        }
      } else if (field === "weight") {
        const parsed = parseWeightInput(raw);
        if (parsed.kind === "bw") {
          await updateSetLog({ id, weight: null, setNote: BW_SET_NOTE });
        } else if (parsed.kind === "clear") {
          const noteAfter = isBodyweightNote(currentNote) ? null : currentNote;
          await updateSetLog({ id, weight: null, setNote: noteAfter });
        } else {
          let noteAfter: string | null = currentNote;
          if (isBodyweightNote(currentNote)) noteAfter = null;
          await updateSetLog({ id, weight: parsed.value, setNote: noteAfter });
        }
      } else if (field === "reps") {
        const v = raw === "" ? null : parseInt(raw, 10);
        await updateSetLog({ id, reps: Number.isNaN(v as number) ? null : v });
      }
    },
    [sets]
  );

  function scheduleSave(
    id: string,
    field: "weight" | "reps" | "set_note",
    raw: string
  ) {
    const key = `${id}:${field}`;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      delete timers.current[key];
      void flushSave(id, field, raw);
    }, 450);
  }

  function updateDraft(id: string, part: keyof Draft, value: string) {
    setDraft((d) => ({
      ...d,
      [id]: { ...d[id], [part]: value },
    }));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/30">
      <table className="w-full min-w-[400px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2.5 pl-3">Set</th>
            <th className="px-1 py-2.5">Wt</th>
            <th className="px-1 py-2.5">Reps</th>
            <th className="px-2 py-2.5 pr-3">Note</th>
            <th className="px-2 py-2.5 pr-3 text-right"> </th>
          </tr>
        </thead>
        <tbody className={pending ? "opacity-70" : ""}>
          {sets.map((s) => {
            const d = draft[s.id] ?? {
              w: "",
              r: "",
              n: "",
            };
            return (
              <tr
                key={s.id}
                className="border-b border-border/30 transition-colors hover:bg-muted/20"
              >
                <td className="px-2 py-1.5 pl-3 font-mono text-xs tabular-nums text-muted-foreground">
                  {s.set_number}
                </td>
                <td className="px-1 py-1">
                  <Input
                    aria-label={`Set ${s.set_number} weight`}
                    className="h-9 w-[4.25rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    value={d.w}
                    type="text"
                    inputMode="decimal"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft(s.id, "w", v);
                      scheduleSave(s.id, "weight", v);
                    }}
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    aria-label={`Set ${s.set_number} reps`}
                    className="h-9 w-[3.25rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    value={d.r}
                    type="text"
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft(s.id, "r", v);
                      scheduleSave(s.id, "reps", v);
                    }}
                  />
                </td>
                <td className="px-2 py-1 pr-3">
                  <Input
                    className="h-9 min-w-[5rem] border-border/60 bg-card/80 text-xs"
                    placeholder="—"
                    value={d.n}
                    disabled={d.w.trim().toLowerCase() === BW_SET_NOTE}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft(s.id, "n", v);
                      scheduleSave(s.id, "set_note", v);
                    }}
                  />
                </td>
                <td className="px-2 py-1 pr-3 text-right">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                    aria-label={`Delete set ${s.set_number}`}
                    onClick={() => {
                      startTransition(async () => {
                        await removeSetLog(s.id);
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
        <button
          type="button"
          className="rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await addSetToSessionExercise(sessionExerciseId);
              router.refresh();
            });
          }}
        >
          + Add Set
        </button>
      </div>
    </div>
  );
}
