"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Data, Layout } from "plotly.js";
import { defaultPlotlyLayout, plotlyConfig } from "@/lib/plotly-theme";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Props = {
  data: Data[];
  layout?: Partial<Layout>;
  className?: string;
};

export function PlotlyChart({ data, layout, className }: Props) {
  const mergedLayout = useMemo(
    () => ({
      ...defaultPlotlyLayout,
      ...layout,
      paper_bgcolor: layout?.paper_bgcolor ?? defaultPlotlyLayout.paper_bgcolor,
      plot_bgcolor: layout?.plot_bgcolor ?? defaultPlotlyLayout.plot_bgcolor,
    }),
    [layout]
  );

  return (
    <div className={className ?? "h-[320px] w-full min-h-[280px]"}>
      <Plot
        data={data}
        layout={mergedLayout as object}
        config={plotlyConfig as object}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    </div>
  );
}
