/* ── Attachment types ──
 *
 * Polymorphic, cross-tool. parent + target are both addressed by
 * type + id pairs. The component renders the target's title +
 * subtitle by looking the source artefact up in the registry.
 */

export type AttachmentParentType =
  | "kanban_task"
  | "kanban_client"
  | "lead"            // /pipeline lead
  | "client"          // post-sign client record (onboarding)
  | "onboarding"
  | "milestone"       // lifecycle milestone
  | "test"            // ab_test
  | "other";

export type AttachmentTargetType =
  | "report"
  | "audit"           // discovery audit
  | "proposal"
  | "brief"
  | "roadmap"
  | "test_win"
  | "ab_test"
  | "case_study"
  | "external";       // any URL outside a Launchpad tool

export interface Attachment {
  id: string;
  parent_type: AttachmentParentType;
  parent_id: string;

  target_type: AttachmentTargetType;
  /* For Launchpad artefacts: id in the source tool's table.
   * For "external" type: empty (use external_url instead). */
  target_id?: string;
  /* Snapshot of the target's title at attach time. Display
   * fallback if the source artefact disappears. */
  target_title: string;
  /* For "external" type: the URL. Internal artefacts derive their
   * URL via the registry. */
  external_url?: string;

  /* Free-text annotation by the person attaching ("review this
   * before the next call"). */
  note?: string;

  attached_by: string;
  created_at: string;
  updated_at: string;
}
