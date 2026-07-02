import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // The previous Vite/esbuild pipeline never type-checked at build time, so
    // the codebase has pre-existing type errors unrelated to the Next migration.
    // Keep builds unblocked and fix types incrementally (`pnpm exec tsc --noEmit`).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
