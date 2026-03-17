/* ── ClickUp workspace constants ── */

export const WORKSPACE_ID = "90152130658";
export const CLIENT_PROJECTS_FOLDER = "901512851148";

/** Custom field IDs from the ClickUp workspace */
export const FIELD_IDS = {
  designDeadline: "e858af69-db7f-4776-ba68-e8e8d2ce8ff3",
  devDeadline: "f80d739a-3e5e-4b98-a016-53b7930b0bc7",
  pageDesignStatus: "a4b765e2-9441-47dc-bac7-1a1d2c5eaaed",
  pageDevStatus: "12f156d3-4ebb-4b39-a477-87b831459c94",
  designOpenClosed: "99f90f8a-6da9-4960-957c-9cc8d65a960f",
  devOpenClosed: "7c4ba32e-7baa-4eb2-bdc2-8e5e9fae8221",
} as const;

/** Pipeline stages in order — index is used for stage position */
export const STAGE_ORDER = [
  "01 - onboarding",
  "02 - design",
  "03 - development",
  "04 - testing",
  "complete",
] as const;

/** Human-readable labels for each stage */
export const STAGE_LABELS: Record<string, string> = {
  "01 - onboarding": "Onboarding",
  "02 - design": "Design",
  "03 - development": "Development",
  "04 - testing": "Testing",
  "complete": "Complete",
};

/**
 * Maps a stage to the checklist name that should be complete
 * before a task enters that stage.
 */
export const QA_GATE_MAP: Record<string, string> = {
  "02 - design": "Onboarding Exit Criteria",
  "03 - development": "Design Exit Criteria",
  "04 - testing": "Development Exit Criteria",
  complete: "Testing Exit Criteria",
};

/** Team member roles */
export type TeamRole = "design" | "dev" | "pm";

/** Known team members with roles (shown even when they have 0 tasks) */
export const TEAM_MEMBERS: readonly { name: string; role: TeamRole }[] = [
  { name: "Dylan Evans", role: "pm" },
  { name: "Alister Carrington", role: "pm" },
  { name: "Archie", role: "dev" },
  { name: "Barnaby Clark", role: "dev" },
  { name: "Brandon Baldwin", role: "dev" },
  { name: "Ian Rex Espinosa", role: "dev" },
  { name: "Mark Angel Dominisac", role: "dev" },
  { name: "Viktoriia Parchuk", role: "design" },
  { name: "Hitesh Kaushal", role: "dev" },
  { name: "Ashish Dadwal", role: "dev" },
  { name: "Parth Verman", role: "dev" },
  { name: "Anna Bila", role: "design" },
  { name: "micklien", role: "dev" },
];

/** ClickUp API base URL */
export const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

/** Cache TTL in milliseconds (5 minutes) */
export const CACHE_TTL = 300_000;
