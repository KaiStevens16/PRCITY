"use client";

import type { Data, Layout } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { formatLongDate } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import { pagesReadCount, type ReadingRow } from "@/lib/reading-data";

type Props = { rows: ReadingRow[] };

export function ReadingTrendChart({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const xs = sorted.map((r) => r.date);
  const dateLabels = sorted.map((r) => formatLongDate(r.date));
  const minutes = sorted.map((r) => r.minutesRead);
  const pages = sorted.map((r) => pagesReadCount(r));

  const minutesTrace: Data = {
    type: "scatter",
    mode: sorted.length < 2 ? "markers" : "lines+markers",
    name: "Minutes read",
    x: xs,
    y: minutes,
    yaxis: "y",
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f} min<extra></extra>",
    line: { color: "hsl(258 88% 68%)", width: 2.5 },
    marker: { size: 7, color: "hsl(258 88% 68%)" },
  };

  const pagesTrace: Data = {
    type: "scatter",
    mode: sorted.length < 2 ? "markers" : "lines+markers",
    name: "Pages (end − start + 1)",
    x: xs,
    y: pages,
    yaxis: "y2",
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.0f} pages<extra></extra>",
    line: { color: "hsl(152 58% 50%)", width: 2.5 },
    marker: { size: 7, color: "hsl(152 58% 50%)" },
  };

  const layout: Partial<Layout> = {
    ...defaultPlotlyLayout,
    margin: { ...defaultPlotlyLayout.margin, r: 52, b: 52 },
    xaxis: {
      ...defaultPlotlyLayout.xaxis,
      title: { text: "Date", font: { size: 10 } },
    },
    yaxis: {
      ...defaultPlotlyLayout.yaxis,
      title: { text: "Minutes", font: { size: 10 } },
      side: "left",
    },
    yaxis2: {
      ...defaultPlotlyLayout.yaxis,
      title: { text: "Pages", font: { size: 10 } },
      overlaying: "y",
      side: "right",
      showgrid: false,
    },
  };

  return (
    <PlotlyChart
      data={[minutesTrace, pagesTrace]}
      layout={layout}
      className="h-[320px] w-full min-h-[280px]"
    />
  );
}
