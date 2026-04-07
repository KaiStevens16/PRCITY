import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { notFound } from "next/navigation";
import Link from "next/link";
import { exerciseFromSlug } from "@/lib/slug";
import { epley1Rm } from "@/lib/e1rm";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Data } from "plotly.js";
import { Button } from "@/components/ui/button";
import type { SetLog } from "@/types/database";
import { formatLongDate } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";

type Props = { params: Promise<{ slug: string }> };

export default async function LiftDetailPage({ params }: Props) {
  const { slug } = await params;
  const name = exerciseFromSlug(slug);
  if (name === "Run") notFound();
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("date", { ascending: true });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const sessionDate = new Map((sessions ?? []).map((s) => [s.id, s.date]));

  if (!sessionIds.length) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lifts">← Lifts</Link>
        </Button>
        <p className="mt-4 text-muted-foreground">No completed sessions.</p>
      </div>
    );
  }

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select("id, session_id, exercise_notes, actual_exercise_name")
    .in("session_id", sessionIds)
    .eq("actual_exercise_name", name);

  if (!sessionExercises?.length) notFound();

  const seIds = sessionExercises.map((x) => x.id);
  const { data: logs } = await supabase
    .from("set_logs")
    .select("*")
    .in("session_exercise_id", seIds)
    .order("set_number", { ascending: true });

  const bySession = new Map<
    string,
    { date: string; sets: SetLog[]; notes: string | null }
  >();
  for (const se of sessionExercises) {
    const d = sessionDate.get(se.session_id);
    if (!d) continue;
    bySession.set(se.id, { date: d, sets: [], notes: se.exercise_notes });
  }
  for (const l of logs ?? []) {
    const entry = bySession.get(l.session_exercise_id);
    if (entry) entry.sets.push(l);
  }

  const points = [...bySession.values()]
    .filter((v) => v.sets.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const dates = points.map((p) => p.date);
  const dateLabels = dates.map(formatLongDate);
  const liftDateXAxis = {
    ...defaultPlotlyLayout.xaxis,
    type: "date" as const,
    tickformat: "%B %-d, %Y",
    ticklabelposition: "outside bottom" as const,
    ticklabelstandoff: 10,
    automargin: true,
  };
  const topSets = points.map((p) => {
    let best = 0;
    for (const s of p.sets) {
      if (s.weight != null && s.reps != null) {
        const w = Number(s.weight);
        const r = Number(s.reps);
        if (w * r > best) best = w * r;
      }
    }
    return best;
  });
  const volumes = points.map((p) =>
    p.sets.reduce((acc, s) => {
      if (s.weight != null && s.reps != null)
        return acc + Number(s.weight) * Number(s.reps);
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
    mode: "lines+markers",
    name: "Top set (wt×reps)",
    x: dates,
    y: topSets,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
    line: {
      color: "hsl(258 88% 68%)",
      width: 2.5,
      shape: "spline",
    },
    marker: { size: 7, line: { width: 0 }, color: "hsl(258 88% 68%)" },
  };

  const volData: Data = {
    type: "scatter",
    mode: "lines+markers",
    name: "Session volume",
    x: dates,
    y: volumes,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f}<extra></extra>",
    line: {
      color: "hsl(152 58% 50%)",
      width: 2.5,
      shape: "spline",
    },
    marker: { size: 7, line: { width: 0 }, color: "hsl(152 58% 50%)" },
  };

  const e1Data: Data = {
    type: "scatter",
    mode: "lines+markers",
    name: "Est. 1RM (Epley)",
    x: dates,
    y: e1rms,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.1f}<extra></extra>",
    line: {
      color: "hsl(22 92% 58%)",
      width: 2.5,
      shape: "spline",
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
        <p className="mt-1 text-sm text-muted-foreground">
          Trends from your completed sessions (actual exercise name).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-1">
        <Card className="border-border/60 bg-card/90 shadow-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Top set load × reps</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <PlotlyChart
              data={[topSetData]}
              layout={{
                xaxis: liftDateXAxis,
                margin: { ...defaultPlotlyLayout.margin, l: 58, r: 16, b: 65 },
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
                xaxis: liftDateXAxis,
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
                xaxis: liftDateXAxis,
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
                key={p.date + (p.notes ?? "")}
                className="border-b border-border/40 pb-2 last:border-0"
              >
                <p className="text-xs text-muted-foreground">{formatLongDate(p.date)}</p>
                <p className="mt-1 text-muted-foreground">
                  {p.notes?.trim() || "—"}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
