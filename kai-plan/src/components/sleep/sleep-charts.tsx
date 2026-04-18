"use client";

import type { Data, Layout } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { formatLongDate } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import type { OuraSleepNightRow } from "@/lib/oura-data";

type Props = { rows: OuraSleepNightRow[] };

function hoursFromSeconds(sec: number | null): number | null {
  if (sec == null || !Number.isFinite(sec)) return null;
  return sec / 3600;
}

export function SleepCharts({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const xs = sorted.map((r) => r.date);
  const dateLabels = sorted.map((r) => formatLongDate(r.date));

  const deep = sorted.map((r) => hoursFromSeconds(r.deepSeconds) ?? 0);
  const rem = sorted.map((r) => hoursFromSeconds(r.remSeconds) ?? 0);
  const light = sorted.map((r) => hoursFromSeconds(r.lightSeconds) ?? 0);
  const hasStages = sorted.some(
    (r) => (r.deepSeconds ?? 0) > 0 || (r.remSeconds ?? 0) > 0 || (r.lightSeconds ?? 0) > 0
  );

  const scores = sorted.map((r) => (r.sleepScore != null && Number.isFinite(r.sleepScore) ? r.sleepScore : null));
  const totalHours = sorted.map((r) => hoursFromSeconds(r.totalSleepSeconds));
  const hasScoreLine = scores.some((s) => s != null);
  const hasTotalLine = totalHours.some((h) => h != null);

  const stageTraces: Data[] = hasStages
    ? [
        {
          type: "bar",
          name: "Deep",
          x: xs,
          y: deep,
          marker: { color: "hsl(258 55% 52%)" },
          customdata: dateLabels,
          hovertemplate: "%{customdata}<br>Deep: %{y:.2f} h<extra></extra>",
        },
        {
          type: "bar",
          name: "REM",
          x: xs,
          y: rem,
          marker: { color: "hsl(200 70% 55%)" },
          customdata: dateLabels,
          hovertemplate: "%{customdata}<br>REM: %{y:.2f} h<extra></extra>",
        },
        {
          type: "bar",
          name: "Light",
          x: xs,
          y: light,
          marker: { color: "hsl(152 45% 42%)" },
          customdata: dateLabels,
          hovertemplate: "%{customdata}<br>Light: %{y:.2f} h<extra></extra>",
        },
      ]
    : [];

  const stageLayout: Partial<Layout> = {
    ...defaultPlotlyLayout,
    barmode: "stack",
    margin: { ...defaultPlotlyLayout.margin, r: 12, b: 52 },
    xaxis: {
      ...defaultPlotlyLayout.xaxis,
      title: { text: "Wake day (Oura)", font: { size: 10 } },
    },
    yaxis: {
      ...defaultPlotlyLayout.yaxis,
      title: { text: "Hours in stage", font: { size: 10 } },
      rangemode: "tozero",
    },
    legend: { ...defaultPlotlyLayout.legend, orientation: "h", y: -0.22 },
  };

  const scoreTrace: Data = {
    type: "scatter",
    mode: sorted.length < 2 ? "markers" : "lines+markers",
    name: "Sleep score",
    x: xs,
    y: scores,
    yaxis: "y",
    connectgaps: false,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>Score: %{y:.0f}<extra></extra>",
    line: { color: "hsl(280 65% 62%)", width: 2.5 },
    marker: { size: 7, color: "hsl(280 65% 62%)" },
  };

  const totalTrace: Data = {
    type: "scatter",
    mode: sorted.length < 2 ? "markers" : "lines+markers",
    name: "Total sleep",
    x: xs,
    y: totalHours,
    yaxis: "y2",
    connectgaps: false,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>Total: %{y:.2f} h<extra></extra>",
    line: { color: "hsl(45 90% 58%)", width: 2.5 },
    marker: { size: 7, color: "hsl(45 90% 58%)" },
  };

  const scoreLayout: Partial<Layout> = {
    ...defaultPlotlyLayout,
    margin: { ...defaultPlotlyLayout.margin, r: 52, b: 52 },
    xaxis: {
      ...defaultPlotlyLayout.xaxis,
      title: { text: "Date", font: { size: 10 } },
    },
    yaxis: {
      ...defaultPlotlyLayout.yaxis,
      title: { text: "Score", font: { size: 10 } },
      side: "left",
      range: hasScoreLine ? [0, 100] : undefined,
    },
    yaxis2: {
      ...defaultPlotlyLayout.yaxis,
      title: { text: "Total sleep (h)", font: { size: 10 } },
      overlaying: "y",
      side: "right",
      showgrid: false,
      rangemode: "tozero",
    },
  };

  const trendData: Data[] = [];
  if (hasScoreLine) trendData.push(scoreTrace);
  if (hasTotalLine) trendData.push(totalTrace);

  return (
    <div className="space-y-8">
      {hasStages ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground/90">Sleep stages (stacked)</h3>
          <PlotlyChart data={stageTraces} layout={stageLayout} className="h-[340px] w-full min-h-[280px]" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Stage breakdown will appear after a successful sync that includes detailed sleep periods (Oura{" "}
          <span className="font-mono text-xs">personal</span> scope).
        </p>
      )}

      {trendData.length ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground/90">Score and total duration</h3>
          <PlotlyChart data={trendData} layout={scoreLayout} className="h-[320px] w-full min-h-[280px]" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No score or total sleep values to plot yet.</p>
      )}
    </div>
  );
}
