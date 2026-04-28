// LOCKED: Quiz question copy and option labels.
// Do not modify wording or order without product approval.

import type {
  Vertical,
  Revenue,
  TrafficSource,
  PainPoint,
  CroHistory,
} from "./types";

export interface QuizOption<T extends string> {
  id: T;
  label: string;
}

export interface QuizQuestion<T extends string> {
  step: number;
  field: (typeof FIELD_BY_STEP)[keyof typeof FIELD_BY_STEP];
  question: string;
  options: QuizOption<T>[];
}

export const FIELD_BY_STEP = {
  1: "vertical",
  2: "revenue",
  3: "trafficSource",
  4: "painPoint",
  5: "croHistory",
} as const;

export const Q1_VERTICAL: QuizQuestion<Vertical> = {
  step: 1,
  field: "vertical",
  question: "What does your store sell?",
  options: [
    { id: "beauty", label: "Beauty / skincare" },
    { id: "supplements", label: "Supplements / health" },
    { id: "apparel", label: "Apparel / accessories" },
    { id: "food", label: "Food / beverage" },
    { id: "other", label: "Something else" },
  ],
};

export const Q2_REVENUE: QuizQuestion<Revenue> = {
  step: 2,
  field: "revenue",
  question: "What's your monthly revenue?",
  options: [
    { id: "under_30k", label: "Under £30k/month" },
    { id: "30k_100k", label: "£30k–£100k/month" },
    { id: "100k_500k", label: "£100k–£500k/month" },
    { id: "500k_1m", label: "£500k–£1M/month" },
    { id: "1m_plus", label: "£1M+/month" },
  ],
};

export const Q3_TRAFFIC: QuizQuestion<TrafficSource> = {
  step: 3,
  field: "trafficSource",
  question: "Where's traffic mostly coming from?",
  options: [
    { id: "meta_cold", label: "Meta ads (cold)" },
    { id: "meta_paid_email", label: "Meta ads + email/SMS" },
    { id: "organic", label: "Mostly organic / SEO" },
    { id: "influencers", label: "Influencers / TikTok" },
    { id: "mixed", label: "Mixed / not sure" },
  ],
};

export const Q4_PAIN: QuizQuestion<PainPoint> = {
  step: 4,
  field: "painPoint",
  question: "What's hurting most right now?",
  options: [
    { id: "ads_not_converting", label: "Ads aren't converting on the landing page" },
    { id: "low_atc", label: "Add-to-cart rate is low" },
    { id: "cart_abandonment", label: "Cart abandonment is brutal" },
    { id: "low_aov", label: "AOV is too low" },
    { id: "all_of_it", label: "Honestly, all of it" },
  ],
};

export const Q5_CRO: QuizQuestion<CroHistory> = {
  step: 5,
  field: "croHistory",
  question: "Have you done CRO work before?",
  options: [
    { id: "never", label: "Never — we just build and ship" },
    { id: "in_house", label: "Some — in-house, no real process" },
    { id: "agency", label: "Worked with an agency before" },
    { id: "currently_testing", label: "Currently testing but results are flat" },
  ],
};

export const QUIZ_QUESTIONS = [Q1_VERTICAL, Q2_REVENUE, Q3_TRAFFIC, Q4_PAIN, Q5_CRO] as const;

export const TOTAL_STEPS = 6; // 5 multi-choice + 1 contact form

// Lookup helpers — used by the result page to render answers nicely
export const VERTICAL_LABELS: Record<Vertical, string> = Object.fromEntries(
  Q1_VERTICAL.options.map((o) => [o.id, o.label]),
) as Record<Vertical, string>;
export const REVENUE_LABELS: Record<Revenue, string> = Object.fromEntries(
  Q2_REVENUE.options.map((o) => [o.id, o.label]),
) as Record<Revenue, string>;
export const TRAFFIC_LABELS: Record<TrafficSource, string> = Object.fromEntries(
  Q3_TRAFFIC.options.map((o) => [o.id, o.label]),
) as Record<TrafficSource, string>;
export const PAIN_LABELS: Record<PainPoint, string> = Object.fromEntries(
  Q4_PAIN.options.map((o) => [o.id, o.label]),
) as Record<PainPoint, string>;
export const CRO_LABELS: Record<CroHistory, string> = Object.fromEntries(
  Q5_CRO.options.map((o) => [o.id, o.label]),
) as Record<CroHistory, string>;
