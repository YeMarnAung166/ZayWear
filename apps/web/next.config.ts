import type { NextConfig } from "next";

// Mock data is a local UI convenience. Baking it into a production build would
// serve placeholder products whose variant ids cannot be ordered, so fail loudly.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_USE_MOCK === "1") {
  throw new Error(
    "NEXT_PUBLIC_USE_MOCK=1 blocks a production build. Unset it and rebuild.",
  );
}

const nextConfig: NextConfig = {
  // Next 16 blocks dev assets for origins other than localhost. Without this the
  // page renders but React never hydrates on 127.0.0.1 or the LAN address, which
  // makes every button (including Add to cart) inert. Add your LAN IP if it changes.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.17"],
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
