/* ── Agency Funnel Node Types ── */

import type { NodeTypeConfig } from "@/lib/funnel-builder/constants";

export type AgencyNodeType =
  | "lead-magnet"
  | "vsl"
  | "case-study"
  | "booking-page"
  | "whatsapp"
  | "email-sequence"
  | "dm-sequence"
  | "webinar"
  | "portfolio"
  | "pricing-page"
  | "application-form"
  | "landing-page"
  | "advertorial"
  | "blog-post";

export const agencyNodeConfigs: Record<AgencyNodeType, NodeTypeConfig> = {
  "lead-magnet": { label: "Lead Magnet", short: "LM", color: "#7C3AED", textColor: "#fff" },
  vsl: { label: "VSL / Video", short: "VSL", color: "#DC2626", textColor: "#fff" },
  "case-study": { label: "Case Study", short: "CS", color: "#1B1B1B", textColor: "#fff" },
  "booking-page": { label: "Book a Call", short: "BOOK", color: "#059669", textColor: "#fff" },
  whatsapp: { label: "WhatsApp", short: "WA", color: "#25D366", textColor: "#fff" },
  "email-sequence": { label: "Email Sequence", short: "EMAIL", color: "#E37400", textColor: "#fff" },
  "dm-sequence": { label: "DM Sequence", short: "DM", color: "#2563EB", textColor: "#fff" },
  webinar: { label: "Webinar / Workshop", short: "WEB", color: "#8B5CF6", textColor: "#fff" },
  portfolio: { label: "Portfolio Page", short: "PORT", color: "#1B1B1B", textColor: "#fff" },
  "pricing-page": { label: "Pricing Page", short: "£", color: "#1B1B1B", textColor: "#fff" },
  "application-form": { label: "Application Form", short: "APP", color: "#F59E0B", textColor: "#fff" },
  "landing-page": { label: "Landing Page", short: "LP", color: "#1B1B1B", textColor: "#fff" },
  advertorial: { label: "Advertorial", short: "ADV", color: "#1B1B1B", textColor: "#fff" },
  "blog-post": { label: "Blog Post", short: "BLOG", color: "#6B7280", textColor: "#fff" },
};

export const agencyNodeTypes: AgencyNodeType[] = [
  "lead-magnet",
  "vsl",
  "case-study",
  "booking-page",
  "whatsapp",
  "email-sequence",
  "dm-sequence",
  "webinar",
  "portfolio",
  "pricing-page",
  "application-form",
  "landing-page",
  "advertorial",
  "blog-post",
];
