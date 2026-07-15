"use client";

/* ── Isolated client dashboard ──
 * /client/[token] — lives in the (portal) group, which has NO navbar, no
 * sidebar, no AuthGate. The token is a random slug (not the engagement id), so
 * the link can't be traced back to internal routes. Read-only, client-safe.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getEngagementByToken,
  type EngagementView,
} from "@/lib/command-centre/store";
import { ClientPortalView } from "@/components/client-portal/client-view";

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<EngagementView | null | undefined>(undefined);

  useEffect(() => {
    setView(getEngagementByToken(token));
  }, [token]);

  if (view === undefined) return null;
  if (view === null) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-sm text-muted">
          This dashboard link isn&apos;t valid or has expired.
        </p>
      </div>
    );
  }

  return <ClientPortalView engagement={view.engagement} client={view.client} />;
}
