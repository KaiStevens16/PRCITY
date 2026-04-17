"use client";

import { useEffect, useState, useTransition } from "react";
import {
  quickAddWorkout,
  quickAddWorkoutBulk,
  quickAddWorkoutFromTemplate,
} from "@/app/actions/history-workout";
import { todayLocalDateString } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

type Props = {
  workoutOptions: { id: string; name: string }[];
  workoutTemplates?: {
    id: string;
    name: string;
    exercises: { exerciseName: string; targetSets: number }[];
  }[];
  defaultLiftName?: string;
  defaultTemplateId?: string;
  compact?: boolean;
};

export function QuickAddWorkoutForm({
  workoutOptions,
  workoutTemplates = [],
  defaultLiftName = "",
  defaultTemplateId,
  compact = false,
}: Props) {
  const [mode, setMode] = useState<"quick" | "template">("quick");
  const [open, setOpen] = useState(false);
  /** Empty on first paint avoids SSR (server TZ) vs client local-date hydration mismatch. */
  const [date, setDate] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? workoutOptions[0]?.id ?? "");
  const [liftName, setLiftName] = useState(defaultLiftName);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [bulkText, setBulkText] = useState("");
  const selectedTemplate =
    workoutTemplates.find((t) => t.id === templateId) ?? null;
  const [templateDraft, setTemplateDraft] = useState<
    Record<string, { weightText: string; repsText: string }[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDate((d) => (d ? d : todayLocalDateString()));
  }, []);

  return (
    <div className={compact ? "" : "rounded-xl border border-border/60 bg-card/70 p-4"}>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          Add workout
        </Button>
      </div>
      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
            <Button
              type="button"
              variant={mode === "quick" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("quick")}
            >
              Quick/paste
            </Button>
            <Button
              type="button"
              variant={mode === "template" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("template")}
            >
              Template entry
            </Button>
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select
            className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {workoutOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {mode === "quick" ? (
            <>
              <Input
                placeholder="Lift (e.g. Incline DB Press)"
                value={liftName}
                onChange={(e) => setLiftName(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </>
          ) : (
            <div className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground flex items-center">
              Fill sets directly for this template below.
            </div>
          )}
          {mode === "quick" && (
          <div className="sm:col-span-2 lg:col-span-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Paste full workout (optional)
            </p>
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Flat bench
185 for 4
185 for 4
---
Incline bench
175 for 4
175 for 4`}
              className="min-h-[180px] border-border/60 bg-background/50 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              If this box has text, it will create all lifts/sets from the paste. Use separator lines like --- between lifts.
            </p>
          </div>
          )}
          {mode === "template" && selectedTemplate && (
            <div className="sm:col-span-2 lg:col-span-4 space-y-3">
              {selectedTemplate.exercises.map((ex) => {
                const rows =
                  templateDraft[ex.exerciseName] ??
                  Array.from(
                    { length: Math.max(1, ex.targetSets + 1) },
                    () => ({ weightText: "", repsText: "" })
                  );
                return (
                  <div key={ex.exerciseName} className="rounded-lg border border-border/50 p-2">
                    <p className="mb-2 text-sm font-medium">{ex.exerciseName}</p>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setTemplateDraft((d) => ({
                            ...d,
                            [ex.exerciseName]: [
                              ...rows,
                              { weightText: "", repsText: "" },
                            ],
                          }));
                        }}
                      >
                        + Add set
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {rows.map((row, idx) => (
                        <div key={`${ex.exerciseName}-${idx}`} className="flex items-center gap-2">
                          <span className="w-8 text-xs text-muted-foreground">#{idx + 1}</span>
                          <Input
                            placeholder="Weight"
                            value={row.weightText}
                            onChange={(e) => {
                              const next = [...rows];
                              next[idx] = { ...next[idx], weightText: e.target.value };
                              setTemplateDraft((d) => ({ ...d, [ex.exerciseName]: next }));
                            }}
                            className="h-8"
                          />
                          <Input
                            placeholder="reps"
                            value={row.repsText}
                            onChange={(e) => {
                              const next = [...rows];
                              next[idx] = { ...next[idx], repsText: e.target.value };
                              setTemplateDraft((d) => ({ ...d, [ex.exerciseName]: next }));
                            }}
                            className="h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                            disabled={rows.length <= 1}
                            aria-label="Remove set row"
                            onClick={() => {
                              if (rows.length <= 1) return;
                              const next = rows.filter((_, i) => i !== idx);
                              setTemplateDraft((d) => ({ ...d, [ex.exerciseName]: next }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-4 mt-1 flex items-center gap-2">
            <Button
              type="button"
              disabled={pending || !date.trim()}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res =
                    mode === "template"
                      ? await quickAddWorkoutFromTemplate({
                          date,
                          templateId,
                          entries: (selectedTemplate?.exercises ?? []).map((ex) => ({
                            exerciseName: ex.exerciseName,
                            sets:
                              templateDraft[ex.exerciseName] ??
                              Array.from(
                                { length: Math.max(1, ex.targetSets + 1) },
                                () => ({ weightText: "", repsText: "" })
                              ),
                          })),
                        })
                      : bulkText.trim().length > 0
                      ? await quickAddWorkoutBulk({
                          date,
                          templateId,
                          rawText: bulkText,
                        })
                      : await quickAddWorkout({
                          date,
                          templateId,
                          liftName,
                          weight:
                            weight.trim() === ""
                              ? null
                              : Number.isFinite(Number(weight))
                              ? Number(weight)
                              : null,
                          reps:
                            reps.trim() === ""
                              ? null
                              : Number.isFinite(Number(reps))
                              ? Number(reps)
                              : null,
                        });
                  if (res && "error" in res && res.error) {
                    setError(res.error);
                    return;
                  }
                  setWeight("");
                  setReps("");
                  setBulkText("");
                  setTemplateDraft({});
                  setOpen(false);
                })
              }
            >
              {pending ? "Saving…" : "Save workout"}
            </Button>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
