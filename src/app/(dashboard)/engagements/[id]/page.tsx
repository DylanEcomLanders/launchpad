"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MOCK_ENGAGEMENTS } from "@/lib/engagement-mocks";
import { loadLocalEngagementById } from "@/lib/engagement-storage";
import type { MockEngagement } from "@/lib/engagement-mocks";
import EngagementDetailClient from "./engagement-detail-client";

export default function EngagementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [engagement, setEngagement] = useState<MockEngagement | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const local = loadLocalEngagementById(id);
    if (local) {
      setEngagement(local);
      return;
    }
    const mock = MOCK_ENGAGEMENTS.find((e) => e.id === id);
    setEngagement(mock ?? null);
  }, [id]);

  if (engagement === undefined) {
    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <p className="text-[12px] text-[#999]">Loading client...</p>
      </div>
    );
  }
  if (engagement === null) {
    notFound();
  }
  return <EngagementDetailClient engagement={engagement} />;
}
