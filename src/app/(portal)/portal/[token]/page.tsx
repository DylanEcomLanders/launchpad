"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  getPortalByToken,
  getUpdates,
  getApprovals,
  updatePortal,
  incrementViewCount,
} from "@/lib/portal/data";
import { getReviews, getVersions, getFeedback } from "@/lib/portal/reviews";
import { getFunnelsByClientId } from "@/lib/funnel-builder/data";
import type { FunnelData } from "@/lib/funnel-builder/types";
import { DEMO_PORTALS } from "@/lib/portal-types";
import { PortalView } from "./portal-view";
import type { PortalData, PortalUpdate, PortalApproval, AdHocRequest } from "@/lib/portal/types";
import type { DesignReview, DesignReviewVersion, DesignReviewFeedback } from "@/lib/portal/review-types";

export default function PortalPage() {
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

  useEffect(() => {
    if (!token) return;

    async function load() {
      setLoading(true);

      // Try Supabase / localStorage
      let p = await getPortalByToken(token);
      let u: PortalUpdate[] = [];
      let a: PortalApproval[] = [];

      if (p) {
        u = await getUpdates(p.id);
        a = await getApprovals(p.id);

        // Load design reviews with versions and feedback
        const allReviews = await getReviews(p.id);
        const versionMap: Record<string, DesignReviewVersion[]> = {};
        const feedbackMap: Record<string, DesignReviewFeedback[]> = {};

        for (const review of allReviews) {
          const versions = await getVersions(review.id);
          versionMap[review.id] = versions;

          const fb = await getFeedback(review.id);
          // Group feedback by version_id
          for (const f of fb) {
            if (!feedbackMap[f.version_id]) feedbackMap[f.version_id] = [];
            feedbackMap[f.version_id].push(f);
          }
        }

        setReviews(allReviews.filter((r) => !r.review_type || r.review_type === "design"));
        setPageReviews(allReviews.filter((r) => r.review_type === "page"));
        setReviewVersions(versionMap);
        setReviewFeedback(feedbackMap);

        // Load funnels
        const fnls = await getFunnelsByClientId(p.id);
        setFunnels(fnls);
      }

      // Fall back to legacy demo data
      if (!p) {
        const demo = DEMO_PORTALS.find((d) => d.token === token);
        if (demo) {
          p = {
            id: demo.token,
            token: demo.token,
            client_name: demo.clientName,
            client_email: "",
            project_type: demo.projectType,
            current_phase: demo.currentPhase,
            progress: demo.progress,
            next_touchpoint: demo.nextTouchpoint,
            phases: demo.phases.map((ph, i) => ({ ...ph, id: `demo-phase-${i}` })),
            scope: demo.scope,
            deliverables: demo.deliverables.map((d, i) => ({ ...d, id: `demo-del-${i}` })),
            documents: demo.documents,
            results: demo.results,
            created_at: demo.createdAt,
            updated_at: demo.createdAt,
            view_count: demo.viewCount,
          } as PortalData;
        }
      }

      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPortal(p);
      setUpdates(u);
      setApprovals(a);
      setLoading(false);

      // Increment view count (fire-and-forget)
      incrementViewCount(token).catch(() => {});
    }

    load();
  }, [token]);

  const handleSubmitRequest = useCallback(async (title: string, description: string) => {
    if (!portal) return;

    const newRequest: AdHocRequest = {
      id: crypto.randomUUID(),
      title,
      description,
      requested_at: new Date().toISOString(),
      status: "open",
      created_by: portal.client_name,
    };

    const existingRequests = portal.ad_hoc_requests || [];
    const updatedRequests = [...existingRequests, newRequest];

    await updatePortal(portal.id, { ad_hoc_requests: updatedRequests });

    // Update local state so the UI reflects the change immediately
    setPortal((prev) => prev ? { ...prev, ad_hoc_requests: updatedRequests } : prev);
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
        <p className="text-[#7A7A7A] text-sm leading-relaxed">
          This portal link is invalid or has been removed. Please contact your
          project manager for an updated link.
        </p>
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
      onSubmitRequest={handleSubmitRequest}
    />
  );
}
