"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatLongDate, todayLocalDateString, toDateString } from "@/lib/date";
import type { WeightRow } from "@/lib/weight-data";
import type { DexaScan } from "@/types/database";
import { saveWeightAction } from "@/app/actions/weight";
import { WeightTrendChart } from "@/components/weight/weight-trend-chart";
import { DexaScansSection } from "@/components/weight/dexa-scans-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const AUTOSAVE_DEBOUNCE_MS = 650;

function serializePayload(rows: WeightRow[]): string {
  return JSON.stringify(rows);
}

function canonicalRows(rows: WeightRow[]): WeightRow[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

type EditableRow = { id: string; date: string; weight: string; notes: string };

function newEditableRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
}

function isEmptyWeightCell(w: string): boolean {
  const t = w.trim();
  if (!t) return true;
  return Number.isNaN(parseFloat(t.replace(/,/g, "")));
}

/**
 * Keeps exactly one empty row (for "today") at the top:
 * - Empty rows from previous days roll to today.
 * - If top row is already filled and not today, prepend a new empty today row.
 * - Any additional empty rows are removed.
 */
function mergeEnsureTodayRow(rows: EditableRow[], today: string): EditableRow[] {
  if (rows.length === 0) {
    return [{ id: newEditableRowId(), date: today, weight: "", notes: "" }];
  }

  const normalized = rows.map((r) => ({ ...r }));

  // If an empty row already exists, keep it, ensure it is at top, and roll stale date to today.
  const firstEmptyIdx = normalized.findIndex((r) => isEmptyWeightCell(r.weight));
  if (firstEmptyIdx >= 0) {
    const [openRow] = normalized.splice(firstEmptyIdx, 1);
    const nextOpen =
      isValidIsoDate(openRow.date) && openRow.date.trim() < today
        ? { ...openRow, date: today }
        : openRow;
    const nonEmptyRows = normalized.filter((r) => !isEmptyWeightCell(r.weight));
    return [nextOpen, ...nonEmptyRows];
  }

  const first = normalized[0];
  if (isValidIsoDate(first.date) && first.date.trim() === today) {
    return normalized;
  }

  return [{ id: newEditableRowId(), date: today, weight: "", notes: "" }, ...normalized];
}

function toEditable(rows: WeightRow[]): EditableRow[] {
  return [...rows].reverse().map((r, i) => ({
    id: `init-${r.date}-${i}`,
    date: r.date,
    weight: String(r.weight),
    notes: r.notes ?? "",
  }));
}

function nextDayIsoFromRows(rows: EditableRow[]): string {
  let max = "";
  for (const r of rows) {
    const d = r.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= max) max = d;
  }
  if (!max) return todayLocalDateString();
  const [y, m, day] = max.split("-").map(Number);
  const next = new Date(y, m - 1, day + 1);
  return toDateString(next);
}

function rowsForSave(rows: EditableRow[]): WeightRow[] {
  const out: WeightRow[] = [];
  for (const r of rows) {
    const date = r.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const w = parseFloat(r.weight.replace(/,/g, ""));
    if (Number.isNaN(w)) continue;
    out.push({ date, weight: w, notes: r.notes.trim() });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

type Props = { initialRows: WeightRow[]; initialDexaScans: DexaScan[] };

export function WeightPageClient({ initialRows, initialDexaScans }: Props) {
  const [draft, setDraft] = useState<EditableRow[]>(() =>
    mergeEnsureTodayRow(toEditable(initialRows), todayLocalDateString())
  );
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const lastSyncedRef = useRef<string>(serializePayload(canonicalRows(initialRows)));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveHintClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarDateRef = useRef(todayLocalDateString());

  useEffect(() => {
    const serverKey = serializePayload(canonicalRows(initialRows));
    if (serverKey === lastSyncedRef.current) return;
    setDraft(mergeEnsureTodayRow(toEditable(initialRows), todayLocalDateString()));
    lastSyncedRef.current = serverKey;
  }, [initialRows]);

  /** Local calendar rollover: ~every minute + when tab wakes (no server; uses device timezone). */
  useEffect(() => {
    function applyCalendarDayIfNeeded() {
      const today = todayLocalDateString();
      if (today === calendarDateRef.current) return;
      calendarDateRef.current = today;
      setDraft((prev) => mergeEnsureTodayRow(prev, today));
    }

    applyCalendarDayIfNeeded();
    const intervalId = window.setInterval(applyCalendarDayIfNeeded, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") applyCalendarDayIfNeeded();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const saved = useMemo(() => rowsForSave(draft), [draft]);

  useEffect(() => {
    const payload = saved;
    const key = serializePayload(payload);
    if (key === lastSyncedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setError(null);
      startTransition(async () => {
        try {
          const res = await saveWeightAction(payload);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          lastSyncedRef.current = serializePayload(payload);
          setSaveHint("saved");
          if (saveHintClearRef.current) clearTimeout(saveHintClearRef.current);
          saveHintClearRef.current = setTimeout(() => {
            saveHintClearRef.current = null;
            setSaveHint("idle");
          }, 2000);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed");
        }
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [saved]);

  useEffect(
    () => () => {
      if (saveHintClearRef.current) clearTimeout(saveHintClearRef.current);
    },
    []
  );

  const chartRows = saved;
  const last = saved.length ? saved[saved.length - 1] : null;
  const todayBanner = formatLongDate(todayLocalDateString());

  function addRow() {
    setDraft((prev) => [
      { id: newEditableRowId(), date: nextDayIsoFromRows(prev), weight: "", notes: "" },
      ...prev,
    ]);
  }

  function removeRow(id: string) {
    setDraft((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(
    id: string,
    patch: Partial<Pick<EditableRow, "date" | "weight" | "notes">>
  ) {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 h-8 text-muted-foreground"
            asChild
          >
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Command Center
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Weight</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-r from-[hsl(258_45%_22%/0.55)] via-[hsl(220_35%_18%/0.5)] to-[hsl(24_50%_22%/0.45)] px-5 py-4 text-sm text-white shadow-md shadow-black/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold tracking-tight">Today</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            {todayBanner}
          </span>
        </div>
        {last ? (
          <div className="flex flex-col border-t border-white/15 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Latest weigh-in
            </span>
            <span className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
              {last.weight.toFixed(1)} lb
            </span>
            <span className="text-sm font-medium text-white/90">
              {formatLongDate(last.date)}
            </span>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="trend" className="w-full">
        <div className="flex w-full justify-center">
          <TabsList className="h-auto gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            <TabsTrigger value="trend" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Trend
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Data
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trend" className="mt-5 space-y-5">
          <Card className="border-border/60 bg-card/90 shadow-card-lg">
            <CardHeader>
              <CardTitle className="text-base">Trend</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {chartRows.length >= 2 ? (
                <WeightTrendChart rows={chartRows} dexaScans={initialDexaScans} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add at least two weigh-ins in the Data tab to plot the trend.
                </p>
              )}
            </CardContent>
          </Card>
          <DexaScansSection initialScans={initialDexaScans} />
        </TabsContent>

        <TabsContent value="data" className="mt-5">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-b border-border/40 bg-card/95 px-1 pb-3 pt-1 backdrop-blur-sm">
                <Button type="button" variant="secondary" className="gap-2" onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  Add row
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isPending ? "Saving…" : saveHint === "saved" ? "Saved" : "Saves automatically"}
                </span>
              </div>

              <div className="rounded-xl border border-border/50">
                <div className="space-y-2 p-2 sm:hidden">
                  {draft.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border/40 bg-background/40 p-2">
                      <div className="grid grid-cols-1 gap-2">
                        <Input
                          type="date"
                          value={r.date}
                          onChange={(e) => updateRow(r.id, { date: e.target.value })}
                          className="h-9 border-border/60 bg-background/50 font-mono text-xs"
                        />
                        <Input
                          type="text"
                          placeholder="Weight"
                          value={r.weight}
                          onChange={(e) => updateRow(r.id, { weight: e.target.value })}
                          className="h-9 border-border/60 bg-background/50 font-mono tabular-nums"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            value={r.notes}
                            onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                            placeholder="Notes"
                            className="h-9 border-border/60 bg-background/50 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete row"
                            onClick={() => removeRow(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Weight</th>
                      <th className="px-3 py-3">Notes</th>
                      <th className="px-3 py-3 text-center"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/30 transition-colors hover:bg-muted/10"
                      >
                        <td className="p-2 align-middle">
                          <Input
                            type="date"
                            value={r.date}
                            onChange={(e) => updateRow(r.id, { date: e.target.value })}
                            className="h-9 border-border/60 bg-background/50 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <Input
                            type="text"
                            placeholder="—"
                            value={r.weight}
                            onChange={(e) => updateRow(r.id, { weight: e.target.value })}
                            className="h-9 border-border/60 bg-background/50 font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <Input
                            value={r.notes}
                            onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                            placeholder="Notes"
                            className="h-9 border-border/60 bg-background/50 text-xs"
                          />
                        </td>
                        <td className="p-2 align-middle text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete row"
                            onClick={() => removeRow(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {!draft.length && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No rows yet. Add a row to start logging.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
