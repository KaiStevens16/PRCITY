"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { defaultPlotlyLayout } from "@/lib/plotly-theme";
import { formatLongDate, toDateString } from "@/lib/date";
import type { InbodyProxyRow } from "@/lib/inbody-proxy-data";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const FUTURE_DAYS = 20;
const DEXA_PROXY_MULTIPLIER = 1.66;

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

function filteredBodyFatCurrent(
  dates: string[],
  bodyFatPct: number[],
  noisyLatestPct: number
): { filteredSeries: number[]; latest: number; trendLatest: number } {
  const t0 = parseIsoToMs(dates[0]);
  const xs = dates.map((d) => (parseIsoToMs(d) - t0) / 86_400_000);
  const { slope, intercept } = linearFit(xs, bodyFatPct);
  const trendLatest = slope * xs[xs.length - 1] + intercept;

  const baseKalmanGain = 0.38;
  let state = bodyFatPct[0];
  let lastX = xs[0];
  const out: number[] = [state];

  for (let i = 1; i < xs.length; i++) {
    const x = xs[i];
    const dt = x - lastX;
    const predicted = state + slope * dt;
    const trustLatest = i === xs.length - 1 ? 1 - clamp(noisyLatestPct / 100, 0, 1) : 1;
    const gain = baseKalmanGain * trustLatest;
    state = predicted + gain * (bodyFatPct[i] - predicted);
    out.push(state);
    lastX = x;
  }

  return { filteredSeries: out, latest: out[out.length - 1], trendLatest };
}

type Props = { rows: InbodyProxyRow[] };

export function InbodyProxyTrendChart({ rows }: Props) {
  const [latestNoisePct, setLatestNoisePct] = useState(30);

  const derived = useMemo(() => {
    const dates = rows.map((r) => r.date);
    const bodyFat = rows.map((r) => r.bodyFatPct);
    const labels = dates.map(formatLongDate);

    const f = filteredBodyFatCurrent(dates, bodyFat, latestNoisePct);
    const dexaProxy = f.latest * DEXA_PROXY_MULTIPLIER;

    const t0 = parseIsoToMs(dates[0]);
    const xs = dates.map((d) => (parseIsoToMs(d) - t0) / 86_400_000);
    const fitBf = linearFit(xs, bodyFat);

    const lastX = xs[xs.length - 1];
    const lastIso = dates[dates.length - 1];
    const futureDates: string[] = [];
    const futureBf: number[] = [];
    for (let i = 1; i <= FUTURE_DAYS; i++) {
      const x = lastX + i;
      futureDates.push(addDaysToIso(lastIso, i));
      futureBf.push(fitBf.slope * x + fitBf.intercept);
    }
    const futureLabels = futureDates.map(formatLongDate);

    return {
      dates,
      labels,
      bodyFat,
      filteredBf: f.filteredSeries,
      trendLatestBf: f.trendLatest,
      dexaProxy,
      futureDates,
      futureLabels,
      futureBf,
    };
  }, [rows, latestNoisePct]);

  const data: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Body Fat %",
      x: derived.dates,
      y: derived.bodyFat,
      customdata: derived.labels,
      hovertemplate: "%{customdata}<br>%{y:.2f}%<extra></extra>",
      line: { width: 2.2, color: "hsl(22 92% 58%)" },
      marker: { size: 6 },
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "lines",
      name: "Filtered Body Fat %",
      x: derived.dates,
      y: derived.filteredBf,
      customdata: derived.labels,
      hovertemplate: "%{customdata}<br>%{y:.2f}% filtered<extra></extra>",
      line: { width: 2.2, dash: "dot", color: "hsl(258 88% 68%)" },
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "lines",
      name: "Body Fat Projection",
      x: derived.futureDates,
      y: derived.futureBf,
      customdata: derived.futureLabels,
      hovertemplate: "%{customdata}<br>%{y:.2f}% projected<extra></extra>",
      line: { width: 1.8, dash: "dash", color: "hsl(22 65% 52%)" },
      yaxis: "y",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/15 p-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Filtered body fat state
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{derived.filteredBf.at(-1)?.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">Trend-only estimate: {derived.trendLatestBf.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            DEXA proxy
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{derived.dexaProxy.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Filtered body fat × {DEXA_PROXY_MULTIPLIER}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="inbody-noise-slider" className="text-xs text-muted-foreground">
              Latest-point noise
            </Label>
            <span className="font-mono text-xs tabular-nums">{latestNoisePct}%</span>
          </div>
          <Input
            id="inbody-noise-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={latestNoisePct}
            onChange={(e) => setLatestNoisePct(Number(e.target.value))}
            className="mt-2 h-8"
          />
          <p className="mt-1 text-xs text-muted-foreground">Higher = trust recent reading less.</p>
        </div>
      </div>

      <PlotlyChart
        data={data}
        layout={{
          margin: {
            ...defaultPlotlyLayout.margin,
            l: 42,
            r: 16,
            t: 18,
            b: 70,
          },
          xaxis: {
            ...defaultPlotlyLayout.xaxis,
            type: "date",
            tickformat: "%B %-d, %Y",
            title: { text: "Date", font: { size: 11 } },
          },
          yaxis: {
            ...defaultPlotlyLayout.yaxis,
            title: { text: "Body fat (%)", font: { size: 11 } },
          },
          legend: {
            ...defaultPlotlyLayout.legend,
            orientation: "h",
            y: -0.26,
            yanchor: "top",
            x: 0.5,
            xanchor: "center",
          },
        }}
        className="h-[390px] w-full min-h-[300px]"
      />
    </div>
  );
}
