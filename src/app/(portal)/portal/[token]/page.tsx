"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getPortalByToken,
  getUpdates,
  getApprovals,
  incrementViewCount,
} from "@/lib/portal/data";
import { getReviews, getVersions, getFeedback } from "@/lib/portal/reviews";
import { DEMO_PORTALS } from "@/lib/portal-types";
import { PortalView } from "./portal-view";
import type { PortalData, PortalUpdate, PortalApproval } from "@/lib/portal/types";
import type { DesignReview, DesignReviewVersion, DesignReviewFeedback } from "@/lib/portal/review-types";

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [updates, setUpdates] = useState<PortalUpdate[]>([]);
  const [approvals, setApprovals] = useState<PortalApproval[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [reviewVersions, setReviewVersions] = useState<Record<string, DesignReviewVersion[]>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, DesignReviewFeedback[]>>({});
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

        setReviews(allReviews);
        setReviewVersions(versionMap);
        setReviewFeedback(feedbackMap);
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

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F5F5F5] mb-6 animate-pulse" />
        <div className="h-6 w-48 bg-[#F0F0F0] rounded mx-auto mb-3 animate-pulse" />
        <div className="h-4 w-64 bg-[#F5F5F5] rounded mx-auto animate-pulse" />
      </div>
    );
  }

  if (notFound || !portal) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-[#F5F5F5] mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
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
      reviewVersions={reviewVersions}
      reviewFeedback={reviewFeedback}
    />
  );
}
