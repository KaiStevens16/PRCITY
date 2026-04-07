import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["plotly.js", "react-plotly.js"],
};

export default nextConfig;
