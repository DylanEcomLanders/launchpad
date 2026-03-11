/* ── Outreach Sequence Types ── */

export type OutreachType = "cold-email" | "follow-up" | "loom-script" | "linkedin-dm";
export type ToneType = "professional" | "casual" | "direct";

export interface OutreachStep {
  id: string;
  day: number;
  outreachType: OutreachType;
  tone: ToneType;
  subjectLine: string | null;
  body: string;
  generated: boolean;
}

export interface OutreachSequence {
  id: string;
  brand_name: string;
  store_url: string;
  contact_name: string;
  findings: string;
  steps: OutreachStep[];
  created_at: string;
  updated_at: string;
}

export interface OutreachSequenceInsert {
  brand_name: string;
  store_url?: string;
  contact_name?: string;
  findings: string;
  steps: OutreachStep[];
}
