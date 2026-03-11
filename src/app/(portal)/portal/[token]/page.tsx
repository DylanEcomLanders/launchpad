import {
  getPortalByToken,
  getUpdates,
  getApprovals,
  incrementViewCount,
} from "@/lib/portal/data";
import { DEMO_PORTALS } from "@/lib/portal-types";
import { PortalView } from "./portal-view";
import type { PortalData } from "@/lib/portal/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;

  // Try Supabase first
  let portal = await getPortalByToken(token);
  let updates = portal ? await getUpdates(portal.id) : [];
  let approvals = portal ? await getApprovals(portal.id) : [];

  // Fall back to demo data for backward compat
  if (!portal) {
    const demo = DEMO_PORTALS.find((p) => p.token === token);
    if (demo) {
      // Map legacy demo data to new PortalData shape
      portal = {
        id: demo.token,
        token: demo.token,
        client_name: demo.clientName,
        client_email: "",
        project_type: demo.projectType,
        current_phase: demo.currentPhase,
        progress: demo.progress,
        next_touchpoint: demo.nextTouchpoint,
        phases: demo.phases.map((p, i) => ({ ...p, id: `demo-phase-${i}` })),
        scope: demo.scope,
        deliverables: demo.deliverables.map((d, i) => ({ ...d, id: `demo-del-${i}` })),
        documents: demo.documents,
        results: demo.results,
        created_at: demo.createdAt,
        updated_at: demo.createdAt,
        view_count: demo.viewCount,
      } as PortalData;
      updates = [];
      approvals = [];
    }
  }

  if (!portal) {
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

  // Increment view count (fire-and-forget)
  incrementViewCount(token).catch(() => {});

  return <PortalView portal={portal} updates={updates} approvals={approvals} />;
}
