import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "@flow/commercial": "../../packages/commercial/dist",
      "@flow/contracts": "../../packages/contracts/dist",
    },
  },
};

export default nextConfig;
