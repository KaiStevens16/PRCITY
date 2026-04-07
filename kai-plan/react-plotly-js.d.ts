declare module "react-plotly.js" {
  import type { ComponentType, CSSProperties } from "react";
  import type { Config, Data, Layout } from "plotly.js";

  export interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    style?: CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    revision?: number;
    onInitialized?: (figure: unknown, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: unknown, graphDiv: HTMLElement) => void;
    onPurge?: (figure: unknown, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
  }

  const Plot: ComponentType<PlotParams>;
  export default Plot;
}
