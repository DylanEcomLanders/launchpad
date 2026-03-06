import { supabase } from "@/lib/supabase";
import { services } from "@/data/services";
import { ProposalBuilder } from "./proposal-builder";
import { ProposalExpired } from "./proposal-expired";
import type { Proposal } from "@/lib/proposal-types";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ProposalPage({ params }: Props) {
  const { token } = await params;

  // Look up the proposal by token
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
