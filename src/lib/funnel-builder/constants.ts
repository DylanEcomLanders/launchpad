/* ── Funnel Builder Constants ── */

import type { TrafficSource, PageNodeType, FunnelStage } from "./types";

export interface NodeTypeConfig {
  label: string;
  short: string;
  color: string; // badge bg
  textColor: string; // badge text
}

export const trafficSourceConfigs: Record<TrafficSource, NodeTypeConfig> = {
  "meta-ads": { label: "Meta Ads", short: "META", color: "#E8F0FE", textColor: "#1967D2" },
  "google-ads": { label: "Google Ads", short: "GOOG", color: "#FEF3E8", textColor: "#E37400" },
  tiktok: { label: "TikTok", short: "TT", color: "#F0E8FE", textColor: "#7C3AED" },
  email: { label: "Email", short: "EMAIL", color: "#E8FEF0", textColor: "#059669" },
  organic: { label: "Organic", short: "ORG", color: "#F5F5F5", textColor: "#555" },
  referral: { label: "Referral", short: "REF", color: "#FEE8F0", textColor: "#DB2777" },
  direct: { label: "Direct", short: "DIR", color: "#F5F5F5", textColor: "#777" },
};

export const pageNodeConfigs: Record<PageNodeType, NodeTypeConfig> = {
  "PDP (Product Page)": { label: "PDP", short: "PDP", color: "#1B1B1B", textColor: "#fff" },
  "Collection Page": { label: "Collection", short: "COL", color: "#1B1B1B", textColor: "#fff" },
  "Landing Page": { label: "Landing Page", short: "LP", color: "#1B1B1B", textColor: "#fff" },
  Homepage: { label: "Homepage", short: "HOME", color: "#1B1B1B", textColor: "#fff" },
  Advertorial: { label: "Advertorial", short: "ADV", color: "#1B1B1B", textColor: "#fff" },
  "About / Header / Blog": { label: "About / Blog", short: "ABT", color: "#1B1B1B", textColor: "#fff" },
  Cart: { label: "Cart", short: "CART", color: "#F0F0F0", textColor: "#555" },
  Checkout: { label: "Checkout", short: "CHK", color: "#F0F0F0", textColor: "#555" },
  Upsell: { label: "Upsell", short: "UP", color: "#E8FEF0", textColor: "#059669" },
  "Thank You": { label: "Thank You", short: "TY", color: "#E8FEF0", textColor: "#059669" },
};

export const leadMagnetConfig: NodeTypeConfig = {
  label: "Lead Magnet", short: "LM", color: "#E6F9ED", textColor: "#15803D",
};

export const emailSequenceConfig: NodeTypeConfig = {
  label: "Email Sequence", short: "SEQ", color: "#FDF2E9", textColor: "#C2410C",
};

export const trafficSources: TrafficSource[] = [
  "meta-ads", "google-ads", "tiktok", "email", "organic", "referral", "direct",
];

export const pageNodeTypes: PageNodeType[] = [
  "Landing Page", "PDP (Product Page)", "Collection Page", "Homepage",
  "Advertorial", "About / Header / Blog", "Cart", "Checkout", "Upsell", "Thank You",
];

export const warmthColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  cold: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Cold" },
  warm: { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", label: "Warm" },
  hot: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", label: "Hot" },
};

export const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  planned: { bg: "#F5F5F5", text: "#777", dot: "#CCC" },
  "in-progress": { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6" },
  live: { bg: "#ECFDF5", text: "#059669", dot: "#10B981" },
};

export const stageColors: Record<FunnelStage, { bg: string; text: string; label: string }> = {
  tofu: { bg: "#EFF6FF", text: "#2563EB", label: "TOFU" },
  mofu: { bg: "#FFF7ED", text: "#EA580C", label: "MOFU" },
  bofu: { bg: "#ECFDF5", text: "#059669", label: "BOFU" },
};

/** CVR benchmarks for health score calculation */
export const cvrBenchmarks: Record<string, number> = {
  "Landing Page": 3,
  "PDP (Product Page)": 2.5,
  Cart: 60,
  Checkout: 75,
  "Lead Magnet": 25,
  "Email Sequence": 3,
};
