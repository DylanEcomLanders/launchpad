"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

/* Surfaces a banner if the server-side finance API responds with the
 * FINANCE_NOT_CONFIGURED code, so the user gets a clear "you need to
 * set SUPABASE_SERVICE_ROLE_KEY" message instead of staring at a
 * spinner that never resolves. */
export function FinanceConfigCheck() {
  const [missing, setMissing] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/finance/store/finance_company_profile", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 503) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setMissing(body.error || "Finance API not configured");
        }
      } catch {
        /* network error — page-level loaders will surface their own messages */
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || !missing) return null;

  return (
    <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-3">
      <ExclamationTriangleIcon className="size-5 shrink-0 mt-0.5" />
      <div>
        <strong>Finance API isn&rsquo;t fully configured.</strong> {missing}
        <div className="mt-2 text-xs text-red-700">
          Once you add the env vars and restart the dev server, this banner will disappear and
          all features become functional.
        </div>
      </div>
    </div>
  );
}
