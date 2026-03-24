import type { GrowthChannel, GrowthStage, GrowthItemType } from "./types";

export const CHANNELS: { key: GrowthChannel; label: string; icon: string; color: string }[] = [
  { key: "twitter", label: "Twitter / X", icon: "𝕏", color: "#1A1A1A" },
  { key: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#7C3AED" },
  { key: "instagram", label: "Instagram", icon: "◎", color: "#E1306C" },
  { key: "email", label: "Email", icon: "✉", color: "#059669" },
  { key: "paid-media", label: "Paid Media", icon: "$", color: "#E37400" },
  { key: "outbound", label: "Outbound", icon: "→", color: "#6366F1" },
];

export const STAGES: { key: GrowthStage; label: string; warmth: string; color: string }[] = [
  { key: "content", label: "Content", warmth: "Cold", color: "#3B82F6" },
  { key: "capture", label: "Capture", warmth: "Cold → Warm", color: "#F59E0B" },
  { key: "nurture", label: "Nurture", warmth: "Warm", color: "#F97316" },
  { key: "convert", label: "Convert", warmth: "Hot", color: "#EF4444" },
];

export const ITEM_TYPES: { key: GrowthItemType; label: string; stages: GrowthStage[] }[] = [
  { key: "content-piece", label: "Content Piece", stages: ["content"] },
  { key: "lead-magnet", label: "Lead Magnet", stages: ["capture"] },
  { key: "landing-page", label: "Landing Page", stages: ["capture", "convert"] },
  { key: "email-sequence", label: "Email Sequence", stages: ["nurture"] },
  { key: "dm-trigger", label: "DM Trigger", stages: ["capture", "nurture"] },
  { key: "ad-campaign", label: "Ad Campaign", stages: ["content"] },
  { key: "outbound-campaign", label: "Outbound Campaign", stages: ["content", "capture"] },
  { key: "sales-call", label: "Sales Call", stages: ["convert"] },
  { key: "retargeting", label: "Retargeting", stages: ["nurture"] },
  { key: "whatsapp", label: "WhatsApp", stages: ["convert"] },
  { key: "other", label: "Other", stages: ["content", "capture", "nurture", "convert"] },
];

export const STATUS_COLORS = {
  gap: { bg: "bg-red-50", text: "text-red-400", border: "border-red-200", dot: "bg-red-400" },
  planned: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", dot: "bg-amber-400" },
  "in-progress": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", dot: "bg-blue-500" },
  live: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", dot: "bg-emerald-500" },
};
