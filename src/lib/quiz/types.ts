// Locked question option ids — must match the values in questions.ts
export type Vertical = "beauty" | "supplements" | "apparel" | "food" | "other";
export type Revenue = "under_30k" | "30k_100k" | "100k_500k" | "500k_1m" | "1m_plus";
export type TrafficSource = "meta_cold" | "meta_paid_email" | "organic" | "influencers" | "mixed";
export type PainPoint = "ads_not_converting" | "low_atc" | "cart_abandonment" | "low_aov" | "all_of_it";
export type CroHistory = "never" | "in_house" | "agency" | "currently_testing";

export interface QuizAnswers {
  vertical?: Vertical;
  revenue?: Revenue;
  trafficSource?: TrafficSource;
  painPoint?: PainPoint;
  croHistory?: CroHistory;
}

export interface ContactDetails {
  firstName: string;
  email: string;
  storeUrl: string;
  whatsapp?: string;
}

export type LeadTier = "A" | "B" | "C";

export interface QuizSubmission {
  id: string;
  createdAt: string;

  vertical: Vertical;
  revenue: Revenue;
  trafficSource: TrafficSource;
  painPoint: PainPoint;
  croHistory: CroHistory;

  firstName: string;
  email: string;
  storeUrl: string;
  whatsapp: string | null;

  leadTier: LeadTier;
  resultPageId: string;

  emailSent: boolean;
  slackSent: boolean;
  contactedBy: string | null;
  contactedAt: string | null;

  source: string;
  referrer: string;
}

// Snake_case row shape from Supabase
export interface QuizSubmissionRow {
  id: string;
  created_at: string;
  vertical: Vertical;
  revenue: Revenue;
  traffic_source: TrafficSource;
  pain_point: PainPoint;
  cro_history: CroHistory;
  first_name: string;
  email: string;
  store_url: string;
  whatsapp: string | null;
  lead_tier: LeadTier;
  result_page_id: string;
  email_sent: boolean;
  slack_sent: boolean;
  contacted_by: string | null;
  contacted_at: string | null;
  source: string;
  referrer: string;
}

export function fromRow(row: QuizSubmissionRow): QuizSubmission {
  return {
    id: row.id,
    createdAt: row.created_at,
    vertical: row.vertical,
    revenue: row.revenue,
    trafficSource: row.traffic_source,
    painPoint: row.pain_point,
    croHistory: row.cro_history,
    firstName: row.first_name,
    email: row.email,
    storeUrl: row.store_url,
    whatsapp: row.whatsapp,
    leadTier: row.lead_tier,
    resultPageId: row.result_page_id,
    emailSent: row.email_sent,
    slackSent: row.slack_sent,
    contactedBy: row.contacted_by,
    contactedAt: row.contacted_at,
    source: row.source,
    referrer: row.referrer,
  };
}
