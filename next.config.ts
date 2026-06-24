import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    /* Baseline security headers applied to every route. Deliberately NO
     * strict Content-Security-Policy yet: a wrong CSP breaks the live app
     * (Supabase, web fonts, framer-motion, the service-worker register).
     * frame-ancestors 'self' below gives clickjacking protection without
     * the breakage risk; a full CSP should be iterated in preview later. */
    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      // Clickjacking protection via CSP (the modern X-Frame-Options).
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
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
