import { supabase } from "@/lib/supabase";
import { services } from "@/data/services";
import { ProposalBuilder } from "./proposal-builder";
import { ProposalExpired } from "./proposal-expired";
import { ProposalTemplate } from "@/components/offer-engine/proposal-template";
import type { Proposal } from "@/lib/proposal-types";
import type { OfferProposal } from "@/lib/offer-engine/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ProposalPage({ params }: Props) {
  const { token } = await params;

  // Offer Engine proposals take priority — match by slug
  const offer = await supabase
    .from("offer_proposals")
    .select("*")
    .eq("slug", token)
    .maybeSingle();

  if (offer.data) {
    const proposal = offer.data as OfferProposal;
    return <ProposalTemplate content={proposal.content} />;
  }

  // Fall back to legacy tier-link proposal lookup
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return <ProposalExpired reason="not-found" />;
  }

  const proposal = data as Proposal;

  // Check if expired
  if (new Date(proposal.expires_at) < new Date()) {
    return (
      <ProposalExpired reason="expired" clientName={proposal.client_name} />
    );
  }

  // Check if already converted
  if (proposal.converted) {
    return (
      <ProposalExpired reason="converted" clientName={proposal.client_name} />
    );
  }

  // Mark as viewed (fire-and-forget — don't block render)
  if (!proposal.viewed) {
    supabase
      .from("proposals")
      .update({ viewed: true, viewed_at: new Date().toISOString() })
      .eq("id", proposal.id)
      .then(() => {});
  }

  return <ProposalBuilder proposal={proposal} services={services} />;
}
