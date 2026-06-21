"use client";

// Sales Engine is a RETIRED surface - non-accessible in the app. Any visit to
// /sales-engine/* redirects to Mission Control for every role. The routes +
// components stay in git (so we can revive the surface later), they're just
// not navigable. Sidebar links that used to point here were repointed to the
// dashboard/public equivalents (e.g. /tools/portfolio, /case-studies).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";

export default function SalesEngineLayout() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <AuthGate>
      <div className="flex h-screen items-center justify-center bg-[#0C0C0C] text-sm text-white/50">
        Redirecting…
      </div>
    </AuthGate>
  );
}
