import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  typedRoutes: true,
  partialPrefetching: true,
  experimental: {
    // shadcn imports primitives from the `radix-ui` barrel; without this, one `Slot` import pulls
    // in many unrelated primitives (~27 KB gzipped) on every page.
    optimizePackageImports: ['radix-ui'],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
