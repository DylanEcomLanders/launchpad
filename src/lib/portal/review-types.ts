/* ── Design Review types ── */

export type ReviewStatus = "pending" | "changes_requested" | "approved";
export type FeedbackAction = "approved" | "changes_requested" | "comment";

export type ReviewType = "design" | "page";

export interface DesignReview {
  id: string;
  portal_id: string;
  title: string;
  description: string;
  status: ReviewStatus;
  review_type?: ReviewType; // "design" (default) or "page" for staging URL reviews
  created_at: string;
  updated_at: string;
}

export type DesignReviewInsert = Omit<DesignReview, "id" | "status" | "created_at" | "updated_at">;

export interface DesignReviewVersion {
  id: string;
  review_id: string;
  version_number: number;
  figma_url: string;
  staging_url?: string; // for page reviews — the staging/preview URL
  notes: string;
  created_at: string;
}

export type DesignReviewVersionInsert = Omit<DesignReviewVersion, "id" | "created_at">;

export interface DesignReviewFeedback {
  id: string;
  version_id: string;
  review_id: string;
  action: FeedbackAction;
  comment: string;
  submitted_by: string;
  created_at: string;
  pin_x?: number; // percentage (0-100) from left edge
  pin_y?: number; // percentage (0-100) from top edge
  pin_number?: number; // sequential pin number within version
  resolved?: boolean; // whether this pin has been resolved
}

export type DesignReviewFeedbackInsert = Omit<DesignReviewFeedback, "id" | "created_at">;

/* ── Figma embed helper ── */

export function toFigmaEmbed(url: string): string | null {
  // Accept figma.com URLs (file, design, proto, board)
  if (!url || !url.includes("figma.com")) return null;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
}

export function isFigmaUrl(url: string): boolean {
  return /figma\.com\/(file|design|proto|board)\//i.test(url);
}
