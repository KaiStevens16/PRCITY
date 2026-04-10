import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["plotly.js", "react-plotly.js"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
