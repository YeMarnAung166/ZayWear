import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mock images are local SVGs served from /public/mock.
  // Swap to the Supabase CDN + built-in optimisation when real photos land.
  images: {
    unoptimized: true,
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
