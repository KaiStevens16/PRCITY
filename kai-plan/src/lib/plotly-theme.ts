import type { Layout } from "plotly.js";

export const chartColorway = [
  "hsl(258 88% 68%)",
  "hsl(152 58% 50%)",
  "hsl(22 92% 58%)",
  "hsl(200 85% 58%)",
  "hsl(280 65% 62%)",
];

export const defaultPlotlyLayout: Partial<Layout> = {
  autosize: true,
  margin: { l: 52, r: 20, t: 28, b: 44 },
  font: {
    family: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    size: 11,
    color: "hsl(220 14% 78%)",
  },
  paper_bgcolor: "transparent",
  plot_bgcolor: "hsl(230 10% 7% / 0.85)",
  colorway: chartColorway,
  xaxis: {
    gridcolor: "hsl(230 8% 18% / 0.9)",
    zeroline: false,
    showline: false,
    tickfont: { size: 10 },
    ticklen: 4,
  },
  yaxis: {
    gridcolor: "hsl(230 8% 18% / 0.9)",
    zeroline: false,
    showline: false,
    tickfont: { size: 10 },
    ticklen: 4,
  },
  legend: {
    orientation: "h",
    y: -0.22,
    x: 0,
    font: { size: 10 },
    bgcolor: "transparent",
  },
  hoverlabel: {
    bgcolor: "hsl(230 12% 10%)",
    bordercolor: "hsl(230 8% 22%)",
    font: {
      family: "var(--font-geist-sans), system-ui",
      size: 12,
      color: "hsl(210 20% 98%)",
    },
  },
};

export const plotlyConfig = {
  responsive: true,
  displayModeBar: false,
  displaylogo: false,
} as const;
