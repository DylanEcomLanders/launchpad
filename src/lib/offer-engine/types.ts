// ── Offer Engine types ──────────────────────────────────────────────

export interface ProposalStat {
  label: string;
  value: string;
  sub?: string;
}

export interface ProposalLeakBlock {
  title: string;
  paragraphs: string[];
}

export interface ProposalOpportunity {
  eyebrow: string; // "01. The Opportunity"
  titleLead: string; // greyed lead-in phrase
  titleMain: string; // bold continuation
  body: string;
  stats: ProposalStat[];
  leak: ProposalLeakBlock;
}

export interface ProposalPlugInItem {
  text: string;
}

export interface ProposalPlugIn {
  eyebrow: string;
  titleLead: string;
  titleMain: string;
  body: string;
  items: string[];
  closingLine: string;
}

export interface ProposalPricingOption {
  label: string; // "Option A" / "Option B"
  badge?: string; // optional gold badge e.g. "Highest Return"
  title: string;
  description: string;
  price: string; // "£20,000" or "£15,000"
  priceSuffix?: string; // "/mo" or ""
  priceTerms: string; // "Billed monthly. Cancel with 30 days' notice."
  inclusions: string[];
  dark?: boolean; // render dark card
}

export interface ProposalPricing {
  eyebrow: string;
  title: string;
  body: string;
  options: ProposalPricingOption[];
}

export interface ProposalPrinciple {
  title: string;
  body: string;
}

export interface ProposalPrinciples {
  eyebrow: string;
  title: string;
  items: ProposalPrinciple[];
}

export interface ProposalPhase {
  week: string;
  title: string;
  body: string;
}

export interface ProposalTimeline {
  eyebrow: string;
  title: string;
  phases: ProposalPhase[];
  footnote?: string;
}

export interface ProposalSignatory {
  name: string;
  role: string;
}

export interface ProposalQuoteLine {
  label: string;
  amount: string;
}

export interface ProposalSignoff {
  eyebrow: string;
  title: string; // "This proposal is valid for 30 days..."
  quoteLines: ProposalQuoteLine[];
  quoteFootnote: string;
  signatories: ProposalSignatory[];
  closing: string;
}

export interface ProposalContent {
  brandName: string; // "Yorkshire Dental Suite"
  date: string; // "20 April 2026"
  validDays: number; // 30
  heroEyebrow: string; // "Conversion Engine Proposal"
  heroTitle: string; // "Proposed Scope of Work"
  heroSubtitle: string;
  opportunity: ProposalOpportunity;
  plugIn: ProposalPlugIn;
  pricing: ProposalPricing;
  principles: ProposalPrinciples;
  timeline: ProposalTimeline;
  signoff: ProposalSignoff;
}

export interface OfferProposal {
  id: string;
  slug: string; // url segment — unique
  brand_name: string;
  content: ProposalContent;
  created_at: string;
  updated_at: string;
}
