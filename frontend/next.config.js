/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/sb/:path*",
        destination: "https://axlnelpbsdogwpsmviyz.supabase.co/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
