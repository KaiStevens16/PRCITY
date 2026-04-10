"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { formatLongDate, toDateString } from "@/lib/date";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import type { WeightRow } from "@/lib/weight-data";
import type { DexaScan } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const FUTURE_DAYS = 20;
const BODY_FAT_AXIS_MIN = 10;

/** Tighter than default theme so the plot uses more horizontal space. */
const CHART_MARGIN = {
  l: 34,
  rNoBf: 8,
  rBf: 40,
  t: 22,
  bNoDexa: 50,
  bDexa: 90,
} as const;

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

/**
 * z = (actual - trend)/sd:
 * - z <= -1 -> light green (better than estimate)
 * - z ~= 0  -> yellow
 * - z >= +1 -> red (worse than estimate)
 */
function varianceColorFromZ(z: number): string {
  const green = [52, 168, 104] as const;
  const white = [245, 248, 252] as const;
  const red = [168, 42, 42] as const;
  const c = clamp(z, -1, 1);
  if (c <= 0) {
    const t = c + 1; // [-1,0] -> [0,1]
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

/** RMSE of residuals vs OLS line (divide SSE by n−2 when n ≥ 3). */
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

/** One point per calendar day; later scans on the same day win. */
function bodyFatSeriesFromDexa(scans: DexaScan[]): { date: string; pct: number }[] {
  const sorted = [...scans].sort((a, b) => {
    const d = a.scan_date.localeCompare(b.scan_date);
    if (d !== 0) return d;
    return a.created_at.localeCompare(b.created_at);
  });
  const byDate = new Map<string, number>();
  for (const s of sorted) {
    const pct = Number(s.body_fat_pct);
    if (Number.isFinite(pct)) byDate.set(s.scan_date, pct);
  }
  return [...byDate.entries()]
    .map(([date, pct]) => ({ date, pct }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type Props = { rows: WeightRow[]; dexaScans?: DexaScan[] };

export function WeightTrendChart({ rows, dexaScans = [] }: Props) {
  const [showBodyFat, setShowBodyFat] = useState(false);
  const [showOneSd, setShowOneSd] = useState(false);

  const bfSeries = useMemo(() => bodyFatSeriesFromDexa(dexaScans), [dexaScans]);
  const canShowBf = bfSeries.length > 0;

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

  const residualSd = regressionResidualSd(xs, w, slope, intercept);
  const pointZ = xs.map((x, i) => {
    if (residualSd == null || residualSd < 1e-9) return 0;
    return (w[i] - (slope * x + intercept)) / residualSd;
  });
  const pointColors = pointZ.map(varianceColorFromZ);
  const regressionLineDates = [...dates, ...futureDates];
  const xDaysBand = regressionLineDates.map(
    (iso) => (parseIsoToMs(iso) - t0) / 86_400_000
  );
  const yHatOnBand = xDaysBand.map((xd) => slope * xd + intercept);
  const upperBand =
    residualSd != null ? yHatOnBand.map((y) => y + residualSd) : [];
  const lowerBand =
    residualSd != null ? yHatOnBand.map((y) => y - residualSd) : [];

  /** Lock primary axes; include ±1 SD ribbon in range when shown. */
  const allWeightY = [...w, ...futureCenters];
  const yForRange =
    showOneSd && residualSd != null && upperBand.length
      ? [...allWeightY, ...upperBand, ...lowerBand]
      : allWeightY;
  const wMin = Math.min(...yForRange);
  const wMax = Math.max(...yForRange);
  const yPad = Math.max(1.5, (wMax - wMin) * 0.06);
  const yRangeFixed: [number, number] = [wMin - yPad, wMax + yPad];

  const tStart = parseIsoToMs(dates[0]);
  const tEnd = parseIsoToMs(futureDates[futureDates.length - 1]);
  const xPad = Math.max(86_400_000, (tEnd - tStart) * 0.02);
  const xRangeFixed: [string, string] = [
    toDateString(new Date(tStart - xPad)),
    toDateString(new Date(tEnd + xPad)),
  ];

  const bfDates = bfSeries.map((p) => p.date);
  const bfVals = bfSeries.map((p) => p.pct);
  const bfLabels = bfDates.map(formatLongDate);

  const bfHi = bfVals.length ? Math.max(...bfVals) : BODY_FAT_AXIS_MIN;
  const bfAxisPad = Math.max(1.5, (bfHi - BODY_FAT_AXIS_MIN) * 0.1);
  const bodyFatY2Range: [number, number] = [BODY_FAT_AXIS_MIN, bfHi + bfAxisPad];

  const bodyFatTrace: Data = {
    type: "scatter",
    mode: "lines+markers",
    name: "Body Fat %",
    x: bfDates,
    y: bfVals,
    yaxis: "y2",
    customdata: bfLabels,
    hovertemplate: "%{customdata}<br>%{y:.1f}% body fat<extra></extra>",
    line: {
      color: "hsl(210 20% 98%)",
      width: 2.25,
      shape: "spline",
    },
    marker: {
      size: 7,
      color: "hsl(210 20% 98%)",
      symbol: "triangle-up",
      line: { color: "hsl(230 12% 28%)", width: 1 },
    },
  };

  const weightMarkerTrace: Data = {
    type: "scatter",
    mode: "markers",
    name: "Weight",
    x: dates,
    y: w,
    customdata: dateLabels,
    hovertemplate:
      "%{customdata}<br>%{y:.1f} lb<br>Variance z=%{text}<extra></extra>",
    text: pointZ.map((z) => z.toFixed(2)),
    marker: {
      size: 6,
      color: pointColors,
      line: { width: 0 },
    },
  };

  const weightSegmentTraces: Data[] = [];
  for (let i = 1; i < dates.length; i++) {
    const zMid = (pointZ[i - 1] + pointZ[i]) / 2;
    weightSegmentTraces.push({
      type: "scatter",
      mode: "lines",
      showlegend: false,
      hoverinfo: "skip",
      x: [dates[i - 1], dates[i]],
      y: [w[i - 1], w[i]],
      line: {
        color: varianceColorFromZ(zMid),
        width: 2.5,
        shape: "linear",
      },
    });
  }

  const projectionTrace: Data = {
    type: "scatter",
    mode: "lines",
    name: "Projected Weight",
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
    title: { text: "Date", font: { size: 11 }, standoff: canShowBf ? 18 : 10 },
    autorange: false,
    range: xRangeFixed,
  };

  const data: Data[] = (() => {
    const out: Data[] = [];
    if (showOneSd && residualSd != null && sdRibbonX.length) {
      out.push(sdBandTrace);
    }
    out.push(...weightSegmentTraces, weightMarkerTrace, projectionTrace);
    if (showBodyFat && canShowBf) out.push(bodyFatTrace);
    return out;
  })();

  /** Right margin reserved for second y-axis when DEXA data exists (stable when toggling). */
  const marginRight = canShowBf ? CHART_MARGIN.rBf : CHART_MARGIN.rNoBf;
  /** Extra bottom space for Date title + single-row legend (all modes). */
  const marginBottom = canShowBf ? CHART_MARGIN.bDexa : CHART_MARGIN.bNoDexa;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="weight-chart-body-fat"
            checked={showBodyFat}
            disabled={!canShowBf}
            onCheckedChange={(c) => setShowBodyFat(c === true)}
          />
          <Label
            htmlFor="weight-chart-body-fat"
            className={`text-sm font-normal ${!canShowBf ? "text-muted-foreground" : "cursor-pointer"}`}
          >
            Show Body Fat %
          </Label>
        </div>
        {!canShowBf ? (
          <span className="text-xs text-muted-foreground">
            Upload a DEXA scan below to plot body fat on this chart.
          </span>
        ) : null}
        <Button
          type="button"
          variant={showOneSd ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs"
          disabled={residualSd == null}
          title={
            residualSd == null
              ? "Need at least three weigh-ins to estimate spread around the trend line."
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
            r: marginRight,
            b: marginBottom,
            t: CHART_MARGIN.t,
          },
          xaxis,
          yaxis: {
            ...defaultPlotlyLayout.yaxis,
            title: { text: "Weight (lb)", font: { size: 11 } },
            autorange: false,
            range: yRangeFixed,
          },
          ...(showBodyFat && canShowBf
            ? {
                yaxis2: {
                  ...defaultPlotlyLayout.yaxis,
                  title: { text: "Body fat (%)", font: { size: 11 } },
                  overlaying: "y" as const,
                  side: "right" as const,
                  showgrid: false,
                  zeroline: false,
                  autorange: false,
                  range: bodyFatY2Range,
                },
              }
            : {}),
          legend: {
            ...defaultPlotlyLayout.legend,
            orientation: "h",
            y: -0.34,
            yanchor: "top",
            x: 0.5,
            xanchor: "center",
            font: { size: canShowBf ? 9 : 10 },
          },
        }}
        className="h-[380px] w-full min-h-[300px]"
      />
    </div>
  );
}
