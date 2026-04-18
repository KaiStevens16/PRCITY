"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { formatLongDate, todayLocalDateString } from "@/lib/date";
import type { OuraStepDayRow } from "@/lib/oura-data";
import { syncOuraStepsAction } from "@/app/actions/oura";
import { StepsTrendChart } from "@/components/steps/steps-trend-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type OuraQuery = { oura_error?: string; oura_connected?: string; oura_sleep_error?: string };

type Props = {
  initialRows: OuraStepDayRow[];
  ouraConfigured: boolean;
  connected: boolean;
  ouraQuery: OuraQuery;
};

export function StepsPageClient({
  initialRows,
  ouraConfigured,
  connected,
  ouraQuery,
}: Props) {
  const todayBanner = formatLongDate(todayLocalDateString());
  const sleepErr =
    typeof ouraQuery.oura_sleep_error === "string"
      ? (() => {
          try {
            return decodeURIComponent(ouraQuery.oura_sleep_error);
          } catch {
            return ouraQuery.oura_sleep_error;
          }
        })()
      : undefined;
  const sortedAsc = [...initialRows].sort((a, b) => a.date.localeCompare(b.date));
  const last = sortedAsc.length ? sortedAsc[sortedAsc.length - 1] : null;
  const tableRows = [...sortedAsc].reverse();
  const hasStepData = sortedAsc.length > 0;

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
          <h1 className="text-3xl font-bold tracking-tight">Steps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily totals from Oura Cloud (synced into your database).
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
          Oura connected — steps synced.
          {sleepErr ? (
            <span className="mt-2 block border-t border-emerald-500/25 pt-2 text-amber-100/95">
              Sleep sync: {sleepErr}
              {" — "}
              open the <strong className="font-semibold">Sleep</strong> tab after ensuring your Oura app
              requests the <strong className="font-semibold">personal</strong> scope, then sync again.
            </span>
          ) : null}
        </div>
      ) : null}

      {!ouraConfigured && (hasStepData || connected) ? (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-100">This server doesn’t see Oura OAuth env vars</p>
          <p className="mt-1.5 text-muted-foreground">
            The chart and table still show <strong className="text-foreground/90">data already in Supabase</strong>
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

      {!ouraConfigured && !hasStepData && !connected ? (
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
              Link your ring to pull daily step totals into this page.
            </p>
            <Button variant="default" size="sm" asChild>
              <Link href="/api/oura/auth">Connect Oura</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-r from-[hsl(142_40%_18%/0.55)] via-[hsl(220_35%_18%/0.5)] to-[hsl(258_45%_22%/0.45)] px-5 py-4 text-sm text-white shadow-md shadow-black/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold tracking-tight">Today</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            {todayBanner}
          </span>
        </div>
        {last ? (
          <div className="flex flex-col border-t border-white/15 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Latest day in data
            </span>
            <span className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">
              {last.steps.toLocaleString()} steps
            </span>
            <span className="text-sm font-medium text-white/90">{formatLongDate(last.date)}</span>
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="trend" className="w-full">
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <TabsList className="h-auto gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
            <TabsTrigger value="trend" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Trend
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg px-6 data-[state=active]:shadow-sm">
              Data
            </TabsTrigger>
          </TabsList>
          {ouraConfigured && connected ? (
            <form action={syncOuraStepsAction}>
              <SyncFromOuraSubmitButton />
            </form>
          ) : null}
        </div>

        <TabsContent value="trend" className="mt-5 space-y-5">
          <Card className="border-border/60 bg-card/90 shadow-card-lg">
            <CardHeader>
              <CardTitle className="text-base">Trend</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {sortedAsc.length >= 2 ? (
                <StepsTrendChart rows={sortedAsc} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {connected
                    ? "Sync from Oura and keep at least two days of data to plot the trend."
                    : "Connect Oura and sync to load step history."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-5">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3 text-right">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr
                        key={r.date}
                        className="border-b border-border/30 transition-colors hover:bg-muted/10"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs">{r.date}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.steps.toLocaleString()}
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
