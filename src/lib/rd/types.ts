/* ── R&D Tracker types ──
 * Three top-level entities: Initiative, Subpoint, Idea. Stored as
 * jsonb blobs in rd_initiatives / rd_subpoints / rd_ideas via the
 * generic createStore() pattern.
 *
 * Notes on identity:
 *  - owner / submitted_by are stored as free text for V1 (the codebase
 *    has no users table to FK against). When the auth system grows a
 *    proper users table we can swap these to FK uuids. TODO(dylan):
 *    revisit once user identity is wired (see also peopleStore in
 *    @/lib/company — uses similar shape but is admin-gated, so not a
 *    viable source of truth for team-role submitters today).
 *  - rd_subpoints.initiative_id is a soft FK — the app deletes children
 *    explicitly on parent removal. Cascade is not enforced at the DB
 *    level because both rows live as jsonb in their respective tables.
 */

export type RdType = "design" | "dev" | "ops" | "offer" | "tooling";

export type InitiativeStatus = "active" | "parked" | "shipped" | "killed";
export type IdeaStatus = "inbox" | "promoted" | "parked" | "killed";

export interface Initiative {
  id: string;
  name: string;
  type: RdType;
  owner: string;                       // free text for V1 — see file header
  north_star?: string;                 // one sentence on what "done" looks like
  status: InitiativeStatus;
  promoted_from_idea_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subpoint {
  id: string;
  initiative_id: string;               // soft FK → Initiative.id
  title: string;
  notes?: string;
  done: boolean;
  position: number;                    // ordering within an initiative
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  title: string;
  why?: string;                        // why this matters
  type?: RdType | null;                // optional on capture, nudged later
  submitted_by: string;                // free text for V1 — see file header
  status: IdeaStatus;
  created_at: string;
  updated_at: string;
}

/* Visual palette per type. Mirrors how badges colour-code across the
 * app (see content-calendar, finance). Two values per type so the
 * badge keeps decent contrast on its tinted background. */
export const RD_TYPE_META: Record<
  RdType,
  { label: string; bg: string; fg: string }
> = {
  design:  { label: "Design",  bg: "#E0EBFF", fg: "#1E40AF" }, // blue
  dev:     { label: "Dev",     bg: "#CFF3EE", fg: "#0D7C6E" }, // teal
  ops:     { label: "Ops",     bg: "#EBE0FF", fg: "#5B2BB8" }, // purple
  offer:   { label: "Offer",   bg: "#FFEFC9", fg: "#92591A" }, // amber
  tooling: { label: "Tooling", bg: "#DCF5DC", fg: "#1F6B2B" }, // green
};

export const INITIATIVE_STATUSES: InitiativeStatus[] = [
  "active",
  "parked",
  "shipped",
  "killed",
];

export const IDEA_STATUSES: IdeaStatus[] = [
  "inbox",
  "promoted",
  "parked",
  "killed",
];
