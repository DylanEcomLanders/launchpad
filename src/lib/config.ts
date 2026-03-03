export type Tier = "foundation" | "growth" | "scale";

export interface Client {
  name: string;
  tier: Tier;
  monthlyRevenue: number;
}

export const clients: Client[] = [
  { name: "Nutribloom", tier: "growth", monthlyRevenue: 45000 },
  { name: "PeakForm Athletics", tier: "scale", monthlyRevenue: 120000 },
  { name: "Dew Skincare", tier: "foundation", monthlyRevenue: 18000 },
  { name: "Casa & Co", tier: "growth", monthlyRevenue: 65000 },
];

export const retainerTiers: Record<Tier, { name: string; hours: number }> = {
  foundation: { name: "Foundation", hours: 20 },
  growth: { name: "Growth", hours: 35 },
  scale: { name: "Scale", hours: 50 },
};

export const projectTypes = [
  "Full Page Build",
  "Full Theme Rebuild",
  "Foundation Retainer",
  "Growth Retainer",
  "Scale Retainer",
] as const;

export type ProjectType = (typeof projectTypes)[number];

export const deliverableTypes = ["Landing Page", "Performance Test", "Support"] as const;

export type DeliverableType = (typeof deliverableTypes)[number];

export interface Deliverable {
  description: string;
  type: DeliverableType | "";
}

export interface ScopeFormData {
  clientName: string;
  projectType: ProjectType | "";
  projectOverview: string;
  startDate: string;
  endDate: string;
  deliverables: Deliverable[];
  additionalNotes: string;
}

/* ── Agreement-specific types ── */

export const paymentStructures = [
  "Fixed Project Fee",
  "Monthly Retainer",
  "Milestone-Based",
] as const;

export type PaymentStructure = (typeof paymentStructures)[number];

export const paymentTerms = [
  "100% Upfront — Due Upon Receipt",
  "50% Upfront / 50% on Completion",
  "Net 7",
  "Net 14",
  "Net 30",
] as const;

export type PaymentTerm = (typeof paymentTerms)[number];

export interface Milestone {
  description: string;
  amount: string;
}

export interface AgreementDetails {
  clientLegalName: string;
  clientContactName: string;
  clientContactEmail: string;
  clientAddress: string;
  agreementStartDate: string;
  agreementEndDate: string;
  paymentStructure: PaymentStructure | "";
  totalFee: string;
  deposit: string;
  monthlyFee: string;
  milestones: Milestone[];
  paymentTerm: PaymentTerm | "";
  noticePeriod: string;
  additionalTerms: string;
  signature: string;
  signerName: string;
  signerTitle: string;
  signerDate: string;
}

export interface GeneratorFormData extends ScopeFormData {
  showAgreement: boolean;
  agreement: AgreementDetails;
}

/* ── Roadmap-specific types ── */

export const roadmapPhaseNames = [
  "Kickoff",
  "Design",
  "Revision",
  "Development",
  "Launch",
  "30-Day Support",
] as const;

export type RoadmapPhaseName = (typeof roadmapPhaseNames)[number];

export interface RoadmapPhase {
  name: RoadmapPhaseName;
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
}

export interface RoadmapFormData {
  clientName: string;
  projectType: ProjectType | "";
  kickoffDate: string;
  designEndDate: string;
  devEndDate: string;
  phases: RoadmapPhase[];
}
