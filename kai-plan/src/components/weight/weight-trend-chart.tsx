"use client";

import type { Data } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { formatLongDate, toDateString } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import type { WeightRow } from "@/lib/weight-data";

const FUTURE_DAYS = 20;

function parseIsoToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function addDaysToIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toDateString(dt);
}

function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = Math.abs(denom) < 1e-12 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

type Props = { rows: WeightRow[] };

export function WeightTrendChart({ rows }: Props) {
  if (rows.length < 2) return null;

  const dates = rows.map((r) => r.date);
  const w = rows.map((r) => r.weight);
  const dateLabels = dates.map(formatLongDate);

  const t0 = parseIsoToMs(rows[0].date);
  const xs = rows.map((r) => (parseIsoToMs(r.date) - t0) / 86_400_000);
  const { slope, intercept } = linearFit(xs, w);

  const lastX = xs[xs.length - 1];
  const lastIso = rows[rows.length - 1].date;

  const futureDates: string[] = [];
  const futureCenters: number[] = [];

  for (let k = 1; k <= FUTURE_DAYS; k++) {
    const x = lastX + k;
    const iso = addDaysToIso(lastIso, k);
    const yHat = slope * x + intercept;
    futureDates.push(iso);
    futureCenters.push(yHat);
  }

  const futureLabels = futureDates.map(formatLongDate);

  const weightTrace: Data = {
    type: "scatter",
    mode: "lines+markers",
    name: "Weight",
    x: dates,
    y: w,
    customdata: dateLabels,
    hovertemplate: "%{customdata}<br>%{y:.1f}<extra></extra>",
    line: {
      color: "hsl(200 85% 58%)",
      width: 2.5,
      shape: "spline",
    },
    marker: {
      size: 6,
      color: "hsl(200 90% 62%)",
      line: { width: 0 },
    },
  };

  const projectionTrace: Data = {
    type: "scatter",
    mode: "lines",
    name: "Projected weight",
    x: futureDates,
    y: futureCenters,
    customdata: futureLabels,
    hovertemplate: "%{customdata}<br>%{y:.1f} lb<extra></extra>",
    line: {
      color: "hsl(220 12% 62%)",
      width: 2,
      dash: "dash",
    },
  };

  const xaxis = {
    ...defaultPlotlyLayout.xaxis,
    type: "date" as const,
    tickformat: "%B %-d, %Y",
    title: { text: "Date", font: { size: 11 } },
  };

  return (
    <PlotlyChart
      data={[weightTrace, projectionTrace]}
      layout={{
        xaxis,
        yaxis: {
          ...defaultPlotlyLayout.yaxis,
          title: { text: "Weight (lb)", font: { size: 11 } },
        },
        legend: {
          ...defaultPlotlyLayout.legend,
          orientation: "h",
          y: -0.2,
          x: 0.5,
          xanchor: "center",
        },
      }}
      className="h-[380px] w-full min-h-[300px]"
    />
  );
}
