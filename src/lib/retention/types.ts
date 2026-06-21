// Retention Dashboard — TypeScript types for the three tables this module
// owns. Shape mirrors migration 029 (JSONB-blob: every field below except
// `id` lives in the `data` column). `client_id` is a plain string FK into
// sales_clients.id (not an enforced relation), matching the repo convention.

/** Health band. Also the shape of sales_clients.health_override. */
export type HealthBand = "green" | "amber" | "red";

/** client_reviews — QBRs and strategic reviews held with a client. */
export interface ClientReview {
  id: string;
  client_id: string;
  type: "qbr" | "strategic_review";
  /** ISO date the review was held. */
  held_at: string;
  notes: string;
  /** ISO date the next review is due. Optional — set when scheduled. */
  next_due_at: string | null;
  created_at: string;
}

/** client_results — the result-mining loop. Proof-of-value wins logged for
 *  renewal conversations (e.g. "+12% CVR on PDP"). */
export interface ClientResult {
  id: string;
  client_id: string;
  title: string;
  /** Free-form metric string, e.g. "+12% CVR on PDP". */
  metric: string;
  /** ISO date the result was logged / achieved. */
  logged_at: string;
  created_at: string;
}

/** retention_tasks — renewal prep, check-ins, anything the CSM must action. */
export interface RetentionTask {
  id: string;
  client_id: string;
  title: string;
  /** ISO date the task is due. */
  due_at: string;
  /** ISO datetime completed, or null while open. */
  completed_at: string | null;
  created_at: string;
}
