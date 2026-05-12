import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      // Legacy tiered pricing routes — collapsed to a single /pricing page.
      // Preserve any external links shared with clients.
      {
        source: "/pricing/tier-1",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/pricing/tier-2",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/sales-deck",
        destination: "/conversion-pack",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
