import type { NextConfig } from "next";

// Mock data is a local UI convenience. Baking it into a production build would
// serve placeholder products whose variant ids cannot be ordered, so fail loudly.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK === "1") {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK=1 blocks a production build. Unset it and rebuild.",
  );
}

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
