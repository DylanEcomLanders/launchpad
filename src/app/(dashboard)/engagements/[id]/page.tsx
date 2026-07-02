"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MOCK_ENGAGEMENTS } from "@/lib/engagement-mocks";
import { loadEngagementFromPodsById } from "@/lib/engagement-from-pods";
import { loadLocalEngagementById } from "@/lib/engagement-storage";
import { getTrashedIds } from "@/lib/engagement-trash";
import type { MockEngagement } from "@/lib/engagement-mocks";
import EngagementDetailClient from "./engagement-detail-client";

export default function EngagementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [engagement, setEngagement] = useState<MockEngagement | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    /* Soft-deleted engagements 404 even if their static mock still
     *  exists in code, so a trashed reference engagement doesn't
     *  resurface via direct URL. Pods + local sources are physically
     *  removed by the trash flow so they already 404 naturally. */
    if (getTrashedIds().has(id)) {
      setEngagement(null);
      return;
    }

    /* Lookup order: localStorage-created (user form), then pods-v2 Client
     * (real ops data), then static MOCK_ENGAGEMENTS (bucket examples).
     * First hit wins. We pull cloud-side pods data first because a fresh
     * browser landing here without visiting /pods-v2 has a cold cache
     * and would 404 on a real pods-v2 client id. */
    const local = loadLocalEngagementById(id);
    if (local) {
      setEngagement(local);
      return;
    }

    (async () => {
      try {
        const { bootstrapPodsSync } = await import("@/lib/pods-v2/sync");
        await bootstrapPodsSync();
      } catch (err) {
        console.error("[engagements] bootstrap failed:", err);
      }
      if (cancelled) return;
      const fromPods = loadEngagementFromPodsById(id);
      if (fromPods) {
        setEngagement(fromPods);
        return;
      }
      const mock = MOCK_ENGAGEMENTS.find((e) => e.id === id);
      setEngagement(mock ?? null);
    })();

    return () => { cancelled = true; };
  }, [id]);

  if (engagement === undefined) {
    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <p className="text-[12px] text-subtle">Loading client...</p>
      </div>
    );
  }
  if (engagement === null) {
    notFound();
  }
  return <EngagementDetailClient engagement={engagement} />;
}
