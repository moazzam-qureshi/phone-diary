import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker runtime stage: emits .next/standalone/server.js
  output: "standalone",
  // tsc + eslint run separately; don't let them block the production build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
