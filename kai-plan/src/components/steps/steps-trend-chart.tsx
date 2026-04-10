"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { formatLongDate, toDateString } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import type { OuraStepDayRow } from "@/lib/oura-data";
import { Button } from "@/components/ui/button";

const FUTURE_DAYS = 20;

const CHART_MARGIN = { l: 34, r: 8, t: 22, b: 50 } as const;

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** For steps: higher than trend → green (pass -z into this vs weight chart). */
function varianceColorFromZ(z: number): string {
  const green = [52, 168, 104] as const;
  const white = [245, 248, 252] as const;
  const red = [168, 42, 42] as const;
  const c = clamp(z, -1, 1);
  if (c <= 0) {
    const t = c + 1;
    return rgb(
      lerp(green[0], white[0], t),
      lerp(green[1], white[1], t),
      lerp(green[2], white[2], t)
    );
  }
  return rgb(
    lerp(white[0], red[0], c),
    lerp(white[1], red[1], c),
    lerp(white[2], red[2], c)
  );
}

function regressionResidualSd(
  xs: number[],
  ys: number[],
  slope: number,
  intercept: number
): number | null {
  const n = xs.length;
  if (n < 3) return null;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (slope * xs[i] + intercept);
    sse += r * r;
  }
  return Math.sqrt(sse / (n - 2));
}

type Props = { rows: OuraStepDayRow[] };

export function StepsTrendChart({ rows }: Props) {
  const [showOneSd, setShowOneSd] = useState(false);

  const chartRows = useMemo(() => {
    const dedup = new Map<string, number>();
    for (const r of rows) {
      dedup.set(r.date, r.steps);
    }
    return [...dedup.entries()]
      .map(([date, steps]) => ({ date, steps }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  if (chartRows.length < 2) return null;

  const dates = chartRows.map((r) => r.date);
  const stepsVals = chartRows.map((r) => r.steps);
  const dateLabels = dates.map(formatLongDate);

  const t0 = parseIsoToMs(chartRows[0].date);
  const xs = chartRows.map((r) => (parseIsoToMs(r.date) - t0) / 86_400_000);
  const { slope, intercept } = linearFit(xs, stepsVals);

  const lastX = xs[xs.length - 1];
  const lastIso = chartRows[chartRows.length - 1].date;

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

  const residualSd = regressionResidualSd(xs, stepsVals, slope, intercept);
  const pointZ = xs.map((x, i) => {
    if (residualSd == null || residualSd < 1e-9) return 0;
    return (stepsVals[i] - (slope * x + intercept)) / residualSd;
  });
  const pointColors = pointZ.map((z) => varianceColorFromZ(-z));
  const regressionLineDates = [...dates, ...futureDates];
  const xDaysBand = regressionLineDates.map(
    (iso) => (parseIsoToMs(iso) - t0) / 86_400_000
  );
  const yHatOnBand = xDaysBand.map((xd) => slope * xd + intercept);
  const upperBand =
    residualSd != null ? yHatOnBand.map((y) => y + residualSd) : [];
  const lowerBand =
    residualSd != null ? yHatOnBand.map((y) => y - residualSd) : [];

  const allY = [...stepsVals, ...futureCenters];
  const yForRange =
    showOneSd && residualSd != null && upperBand.length
      ? [...allY, ...upperBand, ...lowerBand]
      : allY;
  const yMin = Math.min(...yForRange);
  const yMax = Math.max(...yForRange);
  const yPad = Math.max(200, (yMax - yMin) * 0.06);
  const yRangeFixed: [number, number] = [Math.max(0, yMin - yPad), yMax + yPad];

  const tStart = parseIsoToMs(dates[0]);
  const tEnd = parseIsoToMs(futureDates[futureDates.length - 1]);
  const xPad = Math.max(86_400_000, (tEnd - tStart) * 0.02);
  const xRangeFixed: [string, string] = [
    toDateString(new Date(tStart - xPad)),
    toDateString(new Date(tEnd + xPad)),
  ];

  const stepsMarkerTrace: Data = {
    type: "scatter",
    mode: "markers",
    name: "Steps",
    x: dates,
    y: stepsVals,
    customdata: dateLabels,
    hovertemplate:
      "%{customdata}<br>%{y} steps<br>σ vs trend (+= above): %{text}<extra></extra>",
    text: pointZ.map((z) => (-z).toFixed(2)),
    marker: {
      size: 6,
      color: pointColors,
      line: { width: 0 },
    },
  };

  const segmentTraces: Data[] = [];
  for (let i = 1; i < dates.length; i++) {
    const zMid = (pointZ[i - 1] + pointZ[i]) / 2;
    segmentTraces.push({
      type: "scatter",
      mode: "lines",
      showlegend: false,
      hoverinfo: "skip",
      x: [dates[i - 1], dates[i]],
      y: [stepsVals[i - 1], stepsVals[i]],
      line: {
        color: varianceColorFromZ(-zMid),
        width: 2.5,
        shape: "linear",
      },
    });
  }

  const projectionTrace: Data = {
    type: "scatter",
    mode: "lines",
    name: "Projected steps",
    x: futureDates,
    y: futureCenters,
    customdata: futureLabels,
    hovertemplate: "%{customdata}<br>%{y} steps<extra></extra>",
    line: {
      color: "hsl(220 12% 62%)",
      width: 2,
      dash: "dash",
    },
  };

  const sdRibbonX =
    residualSd != null && regressionLineDates.length
      ? [...regressionLineDates, ...[...regressionLineDates].reverse()]
      : [];
  const sdRibbonY =
    residualSd != null && upperBand.length
      ? [...upperBand, ...[...lowerBand].reverse()]
      : [];

  const sdBandTrace: Data = {
    type: "scatter",
    mode: "lines",
    name: "±1 SD",
    x: sdRibbonX,
    y: sdRibbonY,
    fill: "toself",
    fillcolor: "rgba(148, 156, 168, 0.22)",
    line: { color: "transparent", width: 0 },
    hoverinfo: "skip",
    showlegend: true,
  };

  const xaxis = {
    ...defaultPlotlyLayout.xaxis,
    type: "date" as const,
    tickformat: "%B %-d, %Y",
    title: { text: "Date", font: { size: 11 }, standoff: 10 },
    autorange: false,
    range: xRangeFixed,
  };

  const data: Data[] = (() => {
    const out: Data[] = [];
    if (showOneSd && residualSd != null && sdRibbonX.length) {
      out.push(sdBandTrace);
    }
    out.push(...segmentTraces, stepsMarkerTrace, projectionTrace);
    return out;
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={showOneSd ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs"
          disabled={residualSd == null}
          title={
            residualSd == null
              ? "Need at least three days to estimate spread around the trend line."
              : undefined
          }
          onClick={() => setShowOneSd((v) => !v)}
        >
          {showOneSd ? "Hide 1 SD" : "Show 1 SD"}
        </Button>
      </div>
      <PlotlyChart
        data={data}
        layout={{
          margin: {
            ...defaultPlotlyLayout.margin,
            l: CHART_MARGIN.l,
            r: CHART_MARGIN.r,
            b: CHART_MARGIN.b,
            t: CHART_MARGIN.t,
          },
          xaxis,
          yaxis: {
            ...defaultPlotlyLayout.yaxis,
            title: { text: "Steps", font: { size: 11 } },
            autorange: false,
            range: yRangeFixed,
          },
          legend: {
            ...defaultPlotlyLayout.legend,
            orientation: "h",
            y: -0.34,
            yanchor: "top",
            x: 0.5,
            xanchor: "center",
            font: { size: 10 },
          },
        }}
        className="h-[380px] w-full min-h-[300px]"
      />
    </div>
  );
}
