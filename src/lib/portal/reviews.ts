import { supabase } from "@/lib/supabase";
import type {
  DesignReview,
  DesignReviewInsert,
  DesignReviewVersion,
  DesignReviewVersionInsert,
  DesignReviewFeedback,
  DesignReviewFeedbackInsert,
  ReviewStatus,
  ReviewType,
} from "./review-types";

/* ── Local-storage keys ── */
const LS_REVIEWS = "portal-design-reviews";
const LS_VERSIONS = "portal-design-versions";
const LS_FEEDBACK = "portal-design-feedback";

function uid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════
// Design Reviews
// ═══════════════════════════════════════════════════════════════════

export async function getReviews(portalId: string): Promise<DesignReview[]> {
  try {
    const { data, error } = await supabase
      .from("design_reviews")
      .select("*")
      .eq("portal_id", portalId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_REVIEWS);
    const all: DesignReview[] = stored ? JSON.parse(stored) : [];
    return all.filter((r) => r.portal_id === portalId);
  }
}

export async function getReviewById(id: string): Promise<DesignReview | null> {
  try {
    const { data, error } = await supabase
      .from("design_reviews")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data ?? null;
  } catch {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(LS_REVIEWS);
    const all: DesignReview[] = stored ? JSON.parse(stored) : [];
    return all.find((r) => r.id === id) ?? null;
  }
}

export async function createReview(input: DesignReviewInsert): Promise<DesignReview> {
  const id = uid();
  const now = new Date().toISOString();
  const row: DesignReview = {
    ...input,
    id,
    status: "pending",
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("design_reviews")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const stored = localStorage.getItem(LS_REVIEWS);
    const all: DesignReview[] = stored ? JSON.parse(stored) : [];
    all.unshift(row);
    localStorage.setItem(LS_REVIEWS, JSON.stringify(all));
    return row;
  }
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<void> {
  try {
    const { error } = await supabase
      .from("design_reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch {
    const stored = localStorage.getItem(LS_REVIEWS);
    const all: DesignReview[] = stored ? JSON.parse(stored) : [];
    const updated = all.map((r) =>
      r.id === id
        ? { ...r, status, updated_at: new Date().toISOString() }
        : r
    );
    localStorage.setItem(LS_REVIEWS, JSON.stringify(updated));
  }
}

export async function deleteReview(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("design_reviews")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const stored = localStorage.getItem(LS_REVIEWS);
    const all: DesignReview[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem(
      LS_REVIEWS,
      JSON.stringify(all.filter((r) => r.id !== id))
    );
    // Also clean up versions and feedback
    const vStored = localStorage.getItem(LS_VERSIONS);
    const versions: DesignReviewVersion[] = vStored ? JSON.parse(vStored) : [];
    localStorage.setItem(
      LS_VERSIONS,
      JSON.stringify(versions.filter((v) => v.review_id !== id))
    );
    const fStored = localStorage.getItem(LS_FEEDBACK);
    const feedback: DesignReviewFeedback[] = fStored ? JSON.parse(fStored) : [];
    localStorage.setItem(
      LS_FEEDBACK,
      JSON.stringify(feedback.filter((f) => f.review_id !== id))
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Versions
// ═══════════════════════════════════════════════════════════════════

export async function getVersions(reviewId: string): Promise<DesignReviewVersion[]> {
  try {
    const { data, error } = await supabase
      .from("design_review_versions")
      .select("*")
      .eq("review_id", reviewId)
      .order("version_number", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_VERSIONS);
    const all: DesignReviewVersion[] = stored ? JSON.parse(stored) : [];
    return all
      .filter((v) => v.review_id === reviewId)
      .sort((a, b) => a.version_number - b.version_number);
  }
}

export async function addVersion(
  input: DesignReviewVersionInsert
): Promise<DesignReviewVersion> {
  const id = uid();
  const now = new Date().toISOString();
  const row: DesignReviewVersion = { ...input, id, created_at: now };

  try {
    const { data, error } = await supabase
      .from("design_review_versions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const stored = localStorage.getItem(LS_VERSIONS);
    const all: DesignReviewVersion[] = stored ? JSON.parse(stored) : [];
    all.push(row);
    localStorage.setItem(LS_VERSIONS, JSON.stringify(all));
    return row;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Feedback (paper trail)
// ═══════════════════════════════════════════════════════════════════

export async function getFeedback(reviewId: string): Promise<DesignReviewFeedback[]> {
  try {
    const { data, error } = await supabase
      .from("design_review_feedback")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_FEEDBACK);
    const all: DesignReviewFeedback[] = stored ? JSON.parse(stored) : [];
    return all
      .filter((f) => f.review_id === reviewId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }
}

export async function addFeedback(
  input: DesignReviewFeedbackInsert
): Promise<DesignReviewFeedback> {
  const id = uid();
  const now = new Date().toISOString();
  const row: DesignReviewFeedback = { ...input, id, created_at: now };

  try {
    const { data, error } = await supabase
      .from("design_review_feedback")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const stored = localStorage.getItem(LS_FEEDBACK);
    const all: DesignReviewFeedback[] = stored ? JSON.parse(stored) : [];
    all.push(row);
    localStorage.setItem(LS_FEEDBACK, JSON.stringify(all));
    return row;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Page Reviews (staging URL reviews — extends design review system)
// ═══════════════════════════════════════════════════════════════════

/** Get reviews filtered by type (design or page) */
export async function getReviewsByType(
  portalId: string,
  reviewType: ReviewType
): Promise<DesignReview[]> {
  const all = await getReviews(portalId);
  if (reviewType === "design") {
    return all.filter((r) => !r.review_type || r.review_type === "design");
  }
  return all.filter((r) => r.review_type === reviewType);
}

/** Get page reviews for a portal */
export async function getPageReviews(portalId: string): Promise<DesignReview[]> {
  return getReviewsByType(portalId, "page");
}

/** Get feedback for a specific version */
export async function getVersionFeedback(
  versionId: string
): Promise<DesignReviewFeedback[]> {
  try {
    const { data, error } = await supabase
      .from("design_review_feedback")
      .select("*")
      .eq("version_id", versionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_FEEDBACK);
    const all: DesignReviewFeedback[] = stored ? JSON.parse(stored) : [];
    return all
      .filter((f) => f.version_id === versionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
}

/** Toggle resolved status on a feedback pin */
export async function updateFeedbackResolved(
  feedbackId: string,
  resolved: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from("design_review_feedback")
      .update({ resolved })
      .eq("id", feedbackId);
    if (error) throw error;
  } catch {
    const stored = localStorage.getItem(LS_FEEDBACK);
    const all: DesignReviewFeedback[] = stored ? JSON.parse(stored) : [];
    const updated = all.map((f) =>
      f.id === feedbackId ? { ...f, resolved } : f
    );
    localStorage.setItem(LS_FEEDBACK, JSON.stringify(updated));
  }
}

/** Get the next pin number for a version */
export async function getNextPinNumber(versionId: string): Promise<number> {
  const feedback = await getVersionFeedback(versionId);
  const pins = feedback.filter((f) => f.pin_x != null && f.pin_y != null);
  if (pins.length === 0) return 1;
  const maxNum = Math.max(...pins.map((p) => p.pin_number || 0));
  return maxNum + 1;
}
