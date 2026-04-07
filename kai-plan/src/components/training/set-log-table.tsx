"use client";

import { useTransition, useEffect, useState, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { updateSetLog } from "@/app/actions/training";
import type { SetLog } from "@/types/database";
import {
  BW_SET_NOTE,
  isBodyweightNote,
  noteDraftFromSet,
  parseWeightInput,
  weightDraftFromSet,
} from "@/lib/bw-set";
import { useRouter } from "next/navigation";

type Props = {
  sets: SetLog[];
};

type Draft = { w: string; r: string; rpe: string; n: string };

function draftKey(sets: SetLog[]) {
  return sets
    .map((s) => `${s.id}:${s.weight}:${s.reps}:${s.rpe}:${s.set_note}:${s.completed}`)
    .join("|");
}

export function SetLogTable({ sets }: Props) {
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
        rpe: s.rpe != null ? String(s.rpe) : "",
        n: noteDraftFromSet(s.set_note),
      };
    }
    setDraft(next);
  }, [sets]);

  const flushSave = useCallback(
    async (id: string, field: "weight" | "reps" | "rpe" | "set_note", raw: string) => {
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
      } else if (field === "rpe") {
        const v = raw === "" ? null : parseFloat(raw);
        await updateSetLog({ id, rpe: v });
      }
    },
    [sets]
  );

  function scheduleSave(
    id: string,
    field: "weight" | "reps" | "rpe" | "set_note",
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
            <th className="px-1 py-2.5">RPE</th>
            <th className="px-2 py-2.5 text-center">✓</th>
            <th className="px-2 py-2.5 pr-3">Note</th>
          </tr>
        </thead>
        <tbody className={pending ? "opacity-70" : ""}>
          {sets.map((s) => {
            const d = draft[s.id] ?? {
              w: "",
              r: "",
              rpe: "",
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
                <td className="px-1 py-1">
                  <Input
                    aria-label={`Set ${s.set_number} RPE`}
                    className="h-9 w-[3rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    value={d.rpe}
                    type="text"
                    inputMode="decimal"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft(s.id, "rpe", v);
                      scheduleSave(s.id, "rpe", v);
                    }}
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <Checkbox
                    className="border-border/80"
                    checked={s.completed}
                    onCheckedChange={(c) => {
                      startTransition(async () => {
                        await updateSetLog({
                          id: s.id,
                          completed: c === true,
                        });
                        router.refresh();
                      });
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
