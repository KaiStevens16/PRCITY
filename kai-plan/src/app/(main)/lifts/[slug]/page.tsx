import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  exerciseFromSlug,
  exerciseSlug,
  expandOrSlotLoggedNameForLiftsBrowse,
  isProtocolOrSlotExerciseName,
} from "@/lib/slug";
import { epley1Rm } from "@/lib/e1rm";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Data } from "plotly.js";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import { QuickAddWorkoutForm } from "@/components/history/quick-add-workout-form";
import { loadLiftChartPoints } from "@/lib/lift-chart-data";
import { fetchProtocolLiftCatalog } from "@/lib/protocol-lifts";
import {
  buildSquatTopSetTraces,
  isSquatLiftPageName,
  isTricepLiftPageName,
  liftPhaseChartXAxis,
  phaseMatchesChart,
  phaseScatterLineShape,
  plotlyXForLiftPoint,
  topSetLoadRepsProduct,
  type LiftChartPoint,
} from "@/lib/lifts-chart";

type Props = { params: Promise<{ slug: string }> };

export default async function LiftDetailPage({ params }: Props) {
  const { slug } = await params;
  const name = exerciseFromSlug(slug);
  if (name === "Run") notFound();
  const supabase = createClient();
  const userId = getSoloUserId();

  if (isProtocolOrSlotExerciseName(name)) {
    const legs = expandOrSlotLoggedNameForLiftsBrowse(name);
    const { data: templates } = await supabase
      .from("workout_templates")
      .select("id, name")
      .eq("is_active", true)
      .order("rotation_order", { ascending: true });
    const workoutOptions = (templates ?? []).map((t) => ({ id: t.id, name: t.name }));
    return (
      <div className="space-y-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lifts">← All lifts</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            This program slot is two different lifts. Use a separate page for each so charts and
            history stay split the way you train them.
          </p>
        </div>
        <div className="grid max-w-md gap-2">
          {legs.map((leg) => (
            <Link
              key={leg}
              href={`/lifts/${exerciseSlug(leg)}`}
              className="rounded-lg border border-border/60 bg-card/80 px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              {leg}
            </Link>
          ))}
        </div>
        <div className="pt-2">
          <QuickAddWorkoutForm workoutOptions={workoutOptions} defaultLiftName={legs[0] ?? ""} compact />
        </div>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("id, name")
    .eq("is_active", true)
    .order("rotation_order", { ascending: true });
  const workoutOptions = (templates ?? []).map((t) => ({ id: t.id, name: t.name }));

  let notOnActiveProtocol: boolean | null = null;
  try {
    const { lifts: protocolLifts } = await fetchProtocolLiftCatalog(supabase);
    notOnActiveProtocol = !protocolLifts.some((l) => l.name === name);
  } catch {
    notOnActiveProtocol = null;
  }

  let points: LiftChartPoint[] = [];
  let loadError: string | null = null;
  try {
    points = await loadLiftChartPoints(supabase, { userId, canonicalLiftName: name });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Unknown error while loading chart data.";
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lifts">← All lifts</Link>
        </Button>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">Could not load this lift&apos;s charts</p>
          <p className="mt-2 text-muted-foreground">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!points.length) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");
    if (count === 0) {
      return (
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/lifts">← Lifts</Link>
          </Button>
          <p className="mt-4 text-muted-foreground">No completed sessions.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lifts">← All lifts</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          {notOnActiveProtocol === true && (
            <p className="mt-2 max-w-xl rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
              This title is not on your active program template, so it will not appear on the Lifts
              index. Charts still aggregate logs that match this name (including substitutions when
              the planned slot was this lift).
            </p>
          )}
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            You have completed workouts, but nothing matched this lift yet. Charts match the
            exercise name (case-insensitive) to &quot;{name}&quot; and OR-slot alternates. If you
            substituted or renamed the lift, open that day in History and check the exact title on
            the card — it must match for trends to appear.
          </p>
        </div>
        <QuickAddWorkoutForm workoutOptions={workoutOptions} defaultLiftName={name} compact />
      </div>
    );
  }

  const isTricep = isTricepLiftPageName(name);
  /** Triceps accessories run on both (H) and (S) upper days but rep style stays “hyper”; do not drop (S) sessions from the first chart. */
  const hypertrophyChartPoints = isTricep
    ? points
    : points.filter((p) => phaseMatchesChart(p.phase, "Hypertrophy"));
  const showStrengthPhaseChart = !isTricep;
  const strengthPoints = showStrengthPhaseChart
    ? points.filter((p) => phaseMatchesChart(p.phase, "Strength"))
    : [];

  const plotXs = points.map((p) => plotlyXForLiftPoint(p));
  const dateLabels = points.map((p) => formatLongDate(p.date));

  const liftDateXAxis = {
    ...defaultPlotlyLayout.xaxis,
    type: "date" as const,
    tickformat: "%B %-d, %Y",
    ticklabelposition: "outside bottom" as const,
    ticklabelstandoff: 10,
    automargin: true,
  };

  const topSets = points.map((p) => topSetLoadRepsProduct(p.sets));
  const volumes = points.map((p) =>
    p.sets.reduce((acc, s) => {
      if (s.weight != null && s.reps != null) return acc + Number(s.weight) * Number(s.reps);
      return acc;
    }, 0)
  );
  const e1rms = points.map((p) => {
    let best: number | null = null;
    for (const s of p.sets) {
      if (s.weight != null && s.reps != null) {
        const e = epley1Rm(Number(s.weight), Number(s.reps));
        if (e != null && (best == null || e > best)) best = e;
      }
    }
    return best ?? 0;
  });

  const topSetData: Data = {
    type: "scatter",
    mode: points.length < 2 ? "markers" : "lines+markers",
    name: "Top set (wt×reps)",
    x: plotXs,
    y: topSets,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
    line: {
      color: "hsl(258 88% 68%)",
      width: 2.5,
      shape: phaseScatterLineShape(points.length),
    },
    marker: { size: 7, line: { width: 0 }, color: "hsl(258 88% 68%)" },
  };

  const phaseTopSetFromPoints = (
    phasePoints: LiftChartPoint[],
    traceName: string,
    color: string
  ): Data => {
    const lineShape = phaseScatterLineShape(phasePoints.length);
    const mode = phasePoints.length < 2 ? "markers" : "lines+markers";
    return {
      type: "scatter",
      mode,
      name: traceName,
      x: phasePoints.map((p) => plotlyXForLiftPoint(p)),
      y: phasePoints.map((p) => topSetLoadRepsProduct(p.sets)),
      customdata: phasePoints.map((p) => formatLongDate(p.date)),
      hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
      line: { color, width: 2.5, shape: lineShape },
      marker: { size: 7, line: { width: 0 }, color },
    };
  };

  const volData: Data = {
    type: "scatter",
    mode: points.length < 2 ? "markers" : "lines+markers",
    name: "Session volume",
    x: plotXs,
    y: volumes,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
    line: {
      color: "hsl(152 58% 50%)",
      width: 2.5,
      shape: phaseScatterLineShape(points.length),
    },
    marker: { size: 7, line: { width: 0 }, color: "hsl(152 58% 50%)" },
  };

  const e1Data: Data = {
    type: "scatter",
    mode: points.length < 2 ? "markers" : "lines+markers",
    name: "Est. 1RM (Epley)",
    x: plotXs,
    y: e1rms,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.1f}<extra></extra>",
    line: {
      color: "hsl(22 92% 58%)",
      width: 2.5,
      shape: phaseScatterLineShape(points.length),
    },
    marker: { size: 7, line: { width: 0 }, color: "hsl(22 92% 58%)" },
  };

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/lifts">← All lifts</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        {notOnActiveProtocol === true && (
          <p className="mt-2 max-w-xl rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
            This title is not on your active program template, so it will not appear on the Lifts
            index. Charts still aggregate logs that match this name (including substitutions when
            the planned slot was this lift).
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Trends from <span className="font-medium text-foreground/80">completed</span> sessions only.
          {isTricep ? (
            <>
              {" "}
              Triceps work here is accessory volume: the first chart includes every session for this
              lift (including strength-themed template days), since rep ranges stay similar across
              those days.
            </>
          ) : (
            <>
              {" "}
              Hypertrophy vs Strength follows the template name suffix{" "}
              <span className="font-medium text-foreground/80">(H)</span> or{" "}
              <span className="font-medium text-foreground/80">(S)</span> when present, then the
              template phase field.
            </>
          )}{" "}
          History can also show in-progress or skipped workouts, which are omitted here until
          completed.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-1">
        <Card className="border-border/60 bg-card/90 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              {isTricep ? "Top set load × reps (all sessions)" : "Hypertrophy top set load × reps"}
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              {isTricep ? (
                <>
                  Every completed session that logged this lift ({hypertrophyChartPoints.length}{" "}
                  total), including Chest (S) and Chest (H) template days — accessory sets are not
                  split by template phase here.
                </>
              ) : (
                <>
                  Sessions whose template name ends with (H), or non-suffixed templates with
                  Hypertrophy phase ({hypertrophyChartPoints.length} logged for this lift).
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <PlotlyChart
              data={[
                phaseTopSetFromPoints(
                  hypertrophyChartPoints,
                  isTricep ? "Top set (all sessions)" : "Hypertrophy top set",
                  "hsl(258 88% 68%)"
                ),
              ]}
              layout={{
                xaxis: { ...liftDateXAxis, ...liftPhaseChartXAxis(hypertrophyChartPoints) },
                margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
              }}
              className="h-[300px] w-full min-h-[260px]"
            />
          </CardContent>
        </Card>
        {showStrengthPhaseChart && (
          <Card className="border-border/60 bg-card/90 shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold">Strength top set load × reps</CardTitle>
              <CardDescription className="text-xs leading-snug">
                Sessions whose template name ends with (S), or non-suffixed templates with Strength
                phase ({strengthPoints.length} logged for this lift).
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <PlotlyChart
                data={[
                  phaseTopSetFromPoints(strengthPoints, "Strength top set", "hsl(22 92% 58%)"),
                ]}
                layout={{
                  xaxis: { ...liftDateXAxis, ...liftPhaseChartXAxis(strengthPoints) },
                  margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
                }}
                className="h-[300px] w-full min-h-[260px]"
              />
            </CardContent>
          </Card>
        )}
        <Card className="border-border/60 bg-card/90 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              {isSquatLiftPageName(name)
                ? "Top set load × reps (○ back · □ front · ◇ unpicked hypertrophy slot)"
                : "Top set load × reps"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <PlotlyChart
              data={isSquatLiftPageName(name) ? buildSquatTopSetTraces(points) : [topSetData]}
              layout={{
                xaxis: { ...liftDateXAxis, ...liftPhaseChartXAxis(points) },
                margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
                showlegend: isSquatLiftPageName(name),
              }}
              className="h-[300px] w-full min-h-[260px]"
            />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/90 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Total session volume</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <PlotlyChart
              data={[volData]}
              layout={{
                xaxis: { ...liftDateXAxis, ...liftPhaseChartXAxis(points) },
                margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
                yaxis: {
                  ...defaultPlotlyLayout.yaxis,
                  title: { text: "Σ weight×reps", font: { size: 10 } },
                },
              }}
              className="h-[300px] w-full min-h-[260px]"
            />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/90 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Estimated 1RM (best set / session)</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <PlotlyChart
              data={[e1Data]}
              layout={{
                xaxis: { ...liftDateXAxis, ...liftPhaseChartXAxis(points) },
                margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
              }}
              className="h-[300px] w-full min-h-[260px]"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="text-base">Recent notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[...points]
            .reverse()
            .slice(0, 8)
            .map((p) => (
              <div
                key={`${p.sessionId}-${p.date}-${p.actualExerciseName}-${p.notes ?? ""}`}
                className="border-b border-border/40 pb-2 last:border-0"
              >
                <p className="text-xs text-muted-foreground">{formatLongDate(p.date)}</p>
                <p className="mt-1 text-muted-foreground">{p.notes?.trim() || "—"}</p>
              </div>
            ))}
        </CardContent>
      </Card>
      <div className="pt-2">
        <QuickAddWorkoutForm workoutOptions={workoutOptions} defaultLiftName={name} compact />
      </div>
    </div>
  );
}
