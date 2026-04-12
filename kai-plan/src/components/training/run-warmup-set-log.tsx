"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRunWarmupSetLog } from "@/app/actions/training";
import type { SetLog } from "@/types/database";
import {
  parseRunWarmupDraft,
  reconcileRunWarmupTriplet,
  visibleRunWarmupSets,
} from "@/lib/run-warmup";

type Props = {
  sets: SetLog[];
};

type Draft = { mi: string; min: string; mph: string };

function draftKey(sets: SetLog[]) {
  return sets.map((s) => `${s.id}:${s.weight}:${s.reps}:${s.rpe}`).join("|");
}

export function RunWarmupSetLog({ sets }: Props) {
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const draftRef = useRef<Record<string, Draft>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syncKey = useRef("");

  useEffect(() => {
    const visible = visibleRunWarmupSets(sets);
    const k = draftKey(visible);
    if (k === syncKey.current) return;
    syncKey.current = k;
    const next: Record<string, Draft> = {};
    for (const s of visible) {
      next[s.id] = {
        mi: s.weight != null ? String(s.weight) : "",
        min: s.reps != null ? String(s.reps) : "",
        mph: s.rpe != null ? String(s.rpe) : "",
      };
    }
    setDraft(next);
    draftRef.current = next;
  }, [sets]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const saveTriplet = useCallback(
    async (id: string, mi: string, min: string, mph: string) => {
      let parsed = parseRunWarmupDraft(mi, min, mph);
      parsed = reconcileRunWarmupTriplet(parsed);
      await updateRunWarmupSetLog({
        setLogId: id,
        miles: parsed.miles,
        minutes: parsed.minutes,
        mph: parsed.mph,
      });
    },
    []
  );

  function scheduleSave(id: string, mi: string, min: string, mph: string) {
    const key = id;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      delete timers.current[key];
      void saveTriplet(id, mi, min, mph);
    }, 450);
  }

  function updateField(setId: string, field: keyof Draft, value: string, row: Draft) {
    const nextRow = { ...row, [field]: value };
    setDraft((d) => {
      const u = { ...d, [setId]: nextRow };
      draftRef.current = u;
      return u;
    });
    scheduleSave(setId, nextRow.mi, nextRow.min, nextRow.mph);
  }

  async function onBlurRecalc(setId: string, row: Draft) {
    let parsed = parseRunWarmupDraft(row.mi, row.min, row.mph);
    parsed = reconcileRunWarmupTriplet(parsed);
    const nextRow: Draft = {
      mi: parsed.miles != null ? String(parsed.miles) : "",
      min: parsed.minutes != null ? String(parsed.minutes) : "",
      mph: parsed.mph != null ? String(Math.round(parsed.mph * 10) / 10) : "",
    };
    setDraft((d) => {
      const u = { ...d, [setId]: nextRow };
      draftRef.current = u;
      return u;
    });
    await saveTriplet(setId, nextRow.mi, nextRow.min, nextRow.mph);
  }

  const rows = visibleRunWarmupSets(sets);
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/30">
      <div className="border-b border-border/50 bg-muted/15 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Treadmill / track warm-up
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Enter any two of distance, time, or speed — the third fills in. Values save as you type.
        </p>
      </div>
      <table className="w-full min-w-[320px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2">Set</th>
            <th className="px-2 py-2">Miles</th>
            <th className="px-2 py-2">Minutes</th>
            <th className="px-2 py-2">Avg mph</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const d = draft[s.id] ?? { mi: "", min: "", mph: "" };
            return (
              <tr key={s.id} className="border-b border-border/30">
                <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                  {s.set_number}
                </td>
                <td className="px-2 py-2">
                  <Label className="sr-only">Miles set {s.set_number}</Label>
                  <Input
                    className="h-9 w-[5rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    type="text"
                    placeholder="mi"
                    value={d.mi}
                    onChange={(e) => updateField(s.id, "mi", e.target.value, d)}
                    onBlur={() => {
                      const row = draftRef.current[s.id] ?? { mi: "", min: "", mph: "" };
                      void onBlurRecalc(s.id, row);
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <Label className="sr-only">Minutes set {s.set_number}</Label>
                  <Input
                    className="h-9 w-[4.25rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    type="text"
                    placeholder="min"
                    value={d.min}
                    onChange={(e) => updateField(s.id, "min", e.target.value, d)}
                    onBlur={() => {
                      const row = draftRef.current[s.id] ?? { mi: "", min: "", mph: "" };
                      void onBlurRecalc(s.id, row);
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <Label className="sr-only">Avg mph set {s.set_number}</Label>
                  <Input
                    className="h-9 w-[4.25rem] border-border/60 bg-card/80 font-mono text-sm tabular-nums"
                    type="text"
                    placeholder="mph"
                    value={d.mph}
                    onChange={(e) => updateField(s.id, "mph", e.target.value, d)}
                    onBlur={() => {
                      const row = draftRef.current[s.id] ?? { mi: "", min: "", mph: "" };
                      void onBlurRecalc(s.id, row);
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
