/* ── Advertorial Production types ──
 * An advertorial task carries a structured brief; a Generate action queues a
 * job that runs the advertorial kit. Nothing generated reaches a client
 * without a human marking it `used`. Mirrors the sandbox Supabase schema
 * (advertorial_briefs / advertorial_jobs) so the localStorage store can be
 * swapped for Supabase without changing consumers.
 */

export type AwarenessLevel = "unaware" | "problem" | "solution" | "product";
export type Language = "UK" | "US";

/** A client review used as evidence. Only verified quotes count toward the gate. */
export interface ReviewQuote {
  quote: string;
  source: string;
  verified: boolean;
}

export interface OfferDetails {
  price: string;
  anchor: string;
  guarantee: string;
  /** Must be answered explicitly. When false the runner forbids urgency devices. */
  urgencyReal: boolean;
  urgencyDetail: string;
}

/** The three hard compliance gates from the template. */
export interface ComplianceFlags {
  ingestible: boolean;
  wellnessClaims: boolean;
  paidSocialImagery: boolean;
}

export interface AdvertorialBrief {
  id: string;
  taskId: string;
  clientId: string;
  /* The four non-inventable inputs: Generate is blocked until all present. */
  productMechanism: string;
  reviewQuotes: ReviewQuote[];
  approvedClaims: string[];
  offerDetails: OfferDetails;
  /* Strategy doc remainder. */
  angle: string;
  awarenessLevel: AwarenessLevel | "";
  adScent: string;
  audience: string;
  language: Language;
  complianceFlags: ComplianceFlags;
  referenceLinks: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus =
  | "queued"
  | "generating"
  | "qa"
  | "draft_ready"
  | "used"
  | "binned"
  | "failed";

/** Parsed from the runner's QA block + the compliance pass. */
export interface QaReport {
  checklist: { item: string; ok: boolean }[];
  /** Where the strategy doc was thin (runner notes). */
  thinNotes: string[];
  compliance: {
    pass: boolean;
    violations: { location: string; rule: string; detail: string }[];
  };
}

export interface AdvertorialJob {
  id: string;
  briefId: string;
  taskId: string;
  clientId: string;
  status: JobStatus;
  kitVersion: string;
  model: string;
  /** Storage path in prod; inline HTML in the localStorage spike. */
  draftHtmlPath?: string;
  draftHtml?: string;
  qaReport?: QaReport;
  qaFlagsCount: number;
  /** Required when status = binned. */
  binReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

/** Brand variables mapped onto the shell's :root CSS variables at generation. */
export interface ClientBrand {
  colorPrimary: string;
  colorInk: string;
  colorBg: string;
  fontHeading: string;
  fontBody: string;
  toneNotes: string;
}

export interface AdvertorialClient {
  id: string;
  name: string;
  brand: ClientBrand;
}

/** A minimal advertorial task (the delivery task this brief hangs off). */
export interface AdvertorialTask {
  id: string;
  clientId: string;
  title: string;
  /** Blocks a client-facing status while an unreviewed draft_ready job exists. */
  clientFacingBlocked?: boolean;
}

/* ── Gate: the primary anti-slop control ──
 * Generate is disabled until the four non-inventable inputs are populated AND
 * at least one review quote is verified. Returns the list of what's missing so
 * the UI can show it. Do not soften this. */
export function briefGateMissing(b: AdvertorialBrief): string[] {
  const missing: string[] = [];
  if (!b.productMechanism.trim()) missing.push("Product mechanism");
  if (!b.reviewQuotes.some((q) => q.verified && q.quote.trim()))
    missing.push("A verified review quote");
  if (!b.approvedClaims.some((c) => c.trim())) missing.push("Approved claims");
  const o = b.offerDetails;
  if (!o.price.trim() && !o.guarantee.trim() && !o.anchor.trim())
    missing.push("Offer details");
  return missing;
}

export function briefCanGenerate(b: AdvertorialBrief): boolean {
  return briefGateMissing(b).length === 0;
}

/** Map a job status onto the shared StatusGlyph vocabulary. */
export function jobGlyphStatus(
  s: JobStatus,
): "backlog" | "todo" | "in_progress" | "review" | "blocked" | "done" {
  switch (s) {
    case "queued":
      return "todo";
    case "generating":
    case "qa":
      return "in_progress";
    case "draft_ready":
      return "review";
    case "used":
      return "done";
    case "binned":
    case "failed":
      return "blocked";
  }
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  generating: "Generating",
  qa: "QA",
  draft_ready: "Draft ready",
  used: "Used",
  binned: "Binned",
  failed: "Failed",
};
