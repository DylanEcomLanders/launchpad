export type PodTier = "premium" | "standard" | "sprint";

export interface Pod {
  id: string;
  name: string;
  description: string;
  tier: PodTier;
  am_name: string;
  designer_name: string;
  dev_name: string;
  created_at: string;
  updated_at: string;
}

export type PodInsert = Omit<Pod, "id" | "created_at" | "updated_at">;

export const TIER_LABEL: Record<PodTier, string> = {
  premium: "Premium",
  standard: "Standard",
  sprint: "Sprint",
};

export const TIER_COLOR: Record<PodTier, { bg: string; text: string; border: string }> = {
  premium: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  standard: { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  sprint: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200" },
};
