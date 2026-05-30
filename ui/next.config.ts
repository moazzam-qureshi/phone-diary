import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker runtime stage: emits .next/standalone/server.js
  output: "standalone",
  // tsc runs separately; don't let type errors block the production build.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
