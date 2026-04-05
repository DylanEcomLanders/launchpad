"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  getPortalByToken,
  getUpdates,
  getApprovals,
  updatePortal,
} from "@/lib/portal/data";
import { getReviews, getVersions, getFeedback } from "@/lib/portal/reviews";
import { getFunnelsByClientId } from "@/lib/funnel-builder/data";
import type { FunnelData } from "@/lib/funnel-builder/types";
import { PortalView } from "../portal-view";
import type { PortalData, PortalUpdate, PortalApproval, PortalProject } from "@/lib/portal/types";
import type { DesignReview, DesignReviewVersion, DesignReviewFeedback } from "@/lib/portal/review-types";

export default function TeamPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [updates, setUpdates] = useState<PortalUpdate[]>([]);
  const [approvals, setApprovals] = useState<PortalApproval[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [pageReviews, setPageReviews] = useState<DesignReview[]>([]);
  const [reviewVersions, setReviewVersions] = useState<Record<string, DesignReviewVersion[]>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, DesignReviewFeedback[]>>({});
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const p = await getPortalByToken(token);

    if (!p) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const [u, a, allReviews, fnls] = await Promise.all([
      getUpdates(p.id),
      getApprovals(p.id),
      getReviews(p.id),
      getFunnelsByClientId(p.id),
    ]);

    const versionMap: Record<string, DesignReviewVersion[]> = {};
    const feedbackMap: Record<string, DesignReviewFeedback[]> = {};
    for (const review of allReviews) {
      const [versions, fb] = await Promise.all([getVersions(review.id), getFeedback(review.id)]);
      versionMap[review.id] = versions;
      for (const f of fb) {
        if (!feedbackMap[f.version_id]) feedbackMap[f.version_id] = [];
        feedbackMap[f.version_id].push(f);
      }
    }

    setPortal(p);
    setUpdates(u);
    setApprovals(a);
    setReviews(allReviews.filter((r) => !r.review_type || r.review_type === "design"));
    setPageReviews(allReviews.filter((r) => r.review_type === "page"));
    setReviewVersions(versionMap);
    setReviewFeedback(feedbackMap);
    setFunnels(fnls);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Handle gate submission from team view
  const handleUpdateProject = useCallback(async (projectId: string, patch: Partial<PortalProject>) => {
    if (!portal) return;
    const updatedProjects = portal.projects.map((p) =>
      p.id === projectId ? { ...p, ...patch } : p
    );
    await updatePortal(portal.id, { projects: updatedProjects } as any);
    setPortal({ ...portal, projects: updatedProjects });
  }, [portal]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F3F3F5] mb-6 animate-pulse" />
        <div className="h-6 w-48 bg-[#EDEDEF] rounded mx-auto mb-3 animate-pulse" />
        <div className="h-4 w-64 bg-[#F3F3F5] rounded mx-auto animate-pulse" />
      </div>
    );
  }

  if (notFound || !portal) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F3F3F5] mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
        <p className="text-[#7A7A7A] text-sm">This portal link is invalid or has been removed.</p>
      </div>
    );
  }

  return (
    <PortalView
      portal={portal}
      updates={updates}
      approvals={approvals}
      reviews={reviews}
      pageReviews={pageReviews}
      reviewVersions={reviewVersions}
      reviewFeedback={reviewFeedback}
      funnels={funnels}
      viewMode="team"
      onUpdateProject={handleUpdateProject}
      onReload={load}
    />
  );
}
