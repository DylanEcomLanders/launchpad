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
      // Finance module rollup — legacy invoice generator, expenses
      // tracker, and company invoices module are now sub-sections of
      // the founder-gated /finance module. Data migrates via the
      // "Import legacy data" button on /finance/settings.
      {
        source: "/tools/invoice-generator",
        destination: "/finance/invoices/new",
        permanent: true,
      },
      {
        source: "/tools/expenses",
        destination: "/finance/expenses",
        permanent: true,
      },
      {
        source: "/company/invoices",
        destination: "/finance/expenses",
        permanent: true,
      },
      {
        source: "/company/invoices/:id",
        destination: "/finance/expenses",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
