"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { addCalendarDays, formatLongDate, todayLocalDateString } from "@/lib/date";
import type { OuraSleepNightRow } from "@/lib/oura-data";
import { syncOuraSleepAction } from "@/app/actions/oura";
import { SleepCharts } from "@/components/sleep/sleep-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function SyncFromOuraSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      className="h-9 border-border/60"
      disabled={pending}
    >
      {pending ? "Syncing…" : "Sync from Oura"}
    </Button>
  );
}

type OuraQuery = {
  oura_error?: string;
  oura_connected?: string;
  oura_sleep_error?: string;
  oura_readiness_error?: string;
  oura_hr_error?: string;
};

type Props = {
  initialRows: OuraSleepNightRow[];
  ouraConfigured: boolean;
  connected: boolean;
  ouraQuery: OuraQuery;
};

function formatDurationSeconds(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  if (sec === 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  try {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    return `${a.toLocaleString(undefined, opts)} → ${b.toLocaleString(undefined, opts)}`;
  } catch {
    return "—";
  }
}

function contributorPairs(contributors: Record<string, unknown> | null): { label: string; value: number }[] {
  if (!contributors) return [];
  return Object.entries(contributors)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k, v]) => ({
      label: k.replace(/_/g, " "),
      value: v as number,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function hasUsableStageData(r: OuraSleepNightRow): boolean {
  return [r.totalSleepSeconds, r.deepSeconds, r.remSeconds, r.lightSeconds].some(
    (s) => s != null && Number.isFinite(s) && s > 0
  );
}

/**
 * Stage minutes in Oura often sit on the **previous calendar day** relative to "today"
 * while the newest row may already show today's wake day with a score only.
 */
function pickLastNightRow(sortedAsc: OuraSleepNightRow[]): OuraSleepNightRow | null {
  if (!sortedAsc.length) return null;
  const byDate = new Map(sortedAsc.map((row) => [row.date, row]));
  const yesterday = addCalendarDays(todayLocalDateString(), -1);
  const yRow = byDate.get(yesterday);
  if (yRow && hasUsableStageData(yRow)) return yRow;

  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    if (hasUsableStageData(sortedAsc[i])) return sortedAsc[i];
  }

  if (yRow) return yRow;
  const latest = sortedAsc[sortedAsc.length - 1];
  return byDate.get(addCalendarDays(latest.date, -1)) ?? sortedAsc[sortedAsc.length - 2] ?? latest;
}

/** Share of `totalSleepSeconds` (Oura main sleep), not time in bed. */
function pctOfTotalSleep(partSeconds: number | null, totalSleepSeconds: number | null): string {
  if (
    partSeconds == null ||
    totalSleepSeconds == null ||
    !Number.isFinite(partSeconds) ||
    !Number.isFinite(totalSleepSeconds) ||
    totalSleepSeconds <= 0
  ) {
    return "—";
  }
  return `${Math.round((partSeconds / totalSleepSeconds) * 100)}%`;
}

export function SleepPageClient({
  initialRows,
  ouraConfigured,
  connected,
  ouraQuery,
}: Props) {
  const todayBanner = formatLongDate(todayLocalDateString());
  const sortedAsc = [...initialRows].sort((a, b) => a.date.localeCompare(b.date));
  const last = sortedAsc.length ? sortedAsc[sortedAsc.length - 1] : null;
  const lastNight = pickLastNightRow(sortedAsc);
  const tableRows = [...sortedAsc].reverse();
  const hasSleepData = sortedAsc.length > 0;
  function decodeParam(v: string | undefined): string | undefined {
    if (typeof v !== "string") return undefined;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  const sleepErrorDecoded = decodeParam(ouraQuery.oura_sleep_error);
  const readinessErrorDecoded = decodeParam(ouraQuery.oura_readiness_error);
  const hrErrorDecoded = decodeParam(ouraQuery.oura_hr_error);

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
          <h1 className="text-3xl font-bold tracking-tight">Sleep</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nightly summaries from Oura (daily score plus main sleep period stages when available).
          </p>
        </div>
      </div>

      {ouraQuery.oura_error ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          Oura: {ouraQuery.oura_error}
        </div>
      ) : null}
      {ouraQuery.oura_connected === "1" ? (
        <div
          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          Oura connected — full sync attempted (sleep, activity, readiness, heart rate).
          {sleepErrorDecoded ? (
            <span className="mt-2 block border-t border-emerald-500/25 pt-2 text-amber-100/95">
              Sleep sync: {sleepErrorDecoded}
            </span>
          ) : null}
          {readinessErrorDecoded ? (
            <span className="mt-2 block border-t border-emerald-500/25 pt-2 text-amber-100/95">
              Readiness sync: {readinessErrorDecoded}
            </span>
          ) : null}
          {hrErrorDecoded ? (
            <span className="mt-2 block border-t border-emerald-500/25 pt-2 text-amber-100/95">
              Heart rate sync: {hrErrorDecoded}
            </span>
          ) : null}
        </div>
      ) : null}

      {!ouraConfigured && (hasSleepData || connected) ? (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-100">This server doesn’t see Oura OAuth env vars</p>
          <p className="mt-1.5 text-muted-foreground">
            The charts and table still show <strong className="text-foreground/90">data already in Supabase</strong>
            {connected ? " and a stored Oura session" : ""}. To <strong className="text-foreground/90">connect or sync</strong>
            , add <span className="font-mono text-[11px]">OURA_CLIENT_ID</span>,{" "}
            <span className="font-mono text-[11px]">OURA_CLIENT_SECRET</span>, and{" "}
            <span className="font-mono text-[11px]">OURA_REDIRECT_URI</span> to{" "}
            <span className="font-mono text-[11px]">.env.local</span> (local) or{" "}
            <strong>Vercel → Project → Settings → Environment Variables</strong> (production), then{" "}
            <strong>restart</strong> <code className="text-xs">npm run dev</code> or <strong>redeploy</strong>.
          </p>
        </div>
      ) : null}

      {!ouraConfigured && !hasSleepData && !connected ? (
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="text-base">Oura not configured</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add <span className="font-mono text-xs">OURA_CLIENT_ID</span>,{" "}
            <span className="font-mono text-xs">OURA_CLIENT_SECRET</span>, and{" "}
            <span className="font-mono text-xs">OURA_REDIRECT_URI</span> to{" "}
            <span className="font-mono text-xs">.env.local</span> (local) or Vercel env (production), then restart or
            redeploy.
          </CardContent>
        </Card>
      ) : null}

      {ouraConfigured && !connected ? (
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="text-base">Connect Oura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Link your ring to pull sleep summaries into this page. Detailed stages require the{" "}
              <span className="font-mono text-xs">personal</span> OAuth scope on your Oura application.
            </p>
            <Button variant="default" size="sm" asChild>
              <Link href="/api/oura/auth">Connect Oura</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-r from-[hsl(258_38%_22%/0.55)] via-[hsl(220_40%_18%/0.5)] to-[hsl(200_45%_20%/0.45)] px-5 py-4 text-sm text-white shadow-md shadow-black/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold tracking-tight">Today</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            {todayBanner}
          </span>
        </div>
        {last ? (
          <div className="flex flex-col border-t border-white/15 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Latest wake day in data
            </span>
            <span className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
              {last.sleepScore != null ? `${Math.round(last.sleepScore)} sleep score` : "— score"}
            </span>
            <span className="text-sm font-medium text-white/90">
              {formatLongDate(last.date)} · {formatDurationSeconds(last.totalSleepSeconds)} asleep
            </span>
            <span className="mt-1 text-xs text-white/75">{formatTimeRange(last.bedtimeStart, last.bedtimeEnd)}</span>
          </div>
        ) : null}
      </div>

      {lastNight ? (
        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last night</CardTitle>
            <CardDescription>
              {formatLongDate(lastNight.date)} — prefers your previous calendar day when that row has stage minutes
              (Oura can show the newest wake-day row with a score before deep/REM/light durations appear there).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Deep sleep
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
                  {formatDurationSeconds(lastNight.deepSeconds)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pctOfTotalSleep(lastNight.deepSeconds, lastNight.totalSleepSeconds)}{" "}
                  <span className="text-xs">of total sleep</span>
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  REM sleep
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
                  {formatDurationSeconds(lastNight.remSeconds)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pctOfTotalSleep(lastNight.remSeconds, lastNight.totalSleepSeconds)}{" "}
                  <span className="text-xs">of total sleep</span>
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Light sleep
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
                  {formatDurationSeconds(lastNight.lightSeconds)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pctOfTotalSleep(lastNight.lightSeconds, lastNight.totalSleepSeconds)}{" "}
                  <span className="text-xs">of total sleep</span>
                </p>
              </div>
            </div>

            {contributorPairs(lastNight.contributors).length ? (
              <div className="space-y-3 border-t border-border/40 pt-5">
                <div>
                  <h3 className="text-sm font-medium text-foreground/90">Oura score components</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sub-scores from Oura&apos;s daily sleep model (typically 0–100), not minutes in bed.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {contributorPairs(lastNight.contributors).map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-3 py-2"
                    >
                      <span className="text-xs capitalize text-muted-foreground">{label}</span>
                      <span className="font-mono text-sm font-semibold tabular-nums">{Math.round(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="border-t border-border/40 pt-5 text-xs text-muted-foreground">
                No contributor breakdown from Oura for this night (daily_sleep scores may sync on a later pull).
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="trends" className="w-full">
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <TabsList className="h-auto gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            <TabsTrigger value="trends" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Trends
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Data
            </TabsTrigger>
          </TabsList>
          {ouraConfigured && connected ? (
            <form action={syncOuraSleepAction}>
              <SyncFromOuraSubmitButton />
            </form>
          ) : null}
        </div>

        <TabsContent value="trends" className="mt-5 space-y-5">
          <Card className="border-border/60 bg-card/90 shadow-card-lg">
            <CardHeader>
              <CardTitle className="text-base">Charts</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {sortedAsc.length >= 1 ? (
                <SleepCharts rows={sortedAsc} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {connected
                    ? "Sync from Oura to load sleep history."
                    : "Connect Oura and sync to load sleep history."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-5">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nightly rows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-3">Date</th>
                      <th className="px-2 py-3 text-right">Score</th>
                      <th className="px-2 py-3 text-right">Total</th>
                      <th className="px-2 py-3 text-right">Deep</th>
                      <th className="px-2 py-3 text-right">REM</th>
                      <th className="px-2 py-3 text-right">Light</th>
                      <th className="px-2 py-3 text-right">Awake</th>
                      <th className="px-2 py-3 text-right">In bed</th>
                      <th className="px-2 py-3 text-right">Eff. %</th>
                      <th className="px-2 py-3 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr
                        key={r.date}
                        className="border-b border-border/30 transition-colors hover:bg-muted/10"
                      >
                        <td className="px-2 py-2.5 font-mono text-xs">{r.date}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {r.sleepScore != null ? Math.round(r.sleepScore) : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.totalSleepSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.deepSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.remSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.lightSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.awakeSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.timeInBedSeconds)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {r.efficiency != null && Number.isFinite(r.efficiency)
                            ? `${Math.round(r.efficiency)}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatDurationSeconds(r.latencySeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tableRows.length && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No rows yet. Connect and sync from Oura.
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
