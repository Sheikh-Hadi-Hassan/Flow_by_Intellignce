import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "@flow/commercial": "../../packages/commercial/dist",
    },
  },
};

export default nextConfig;
