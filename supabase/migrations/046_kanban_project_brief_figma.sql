-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: kanban_projects gets project-level brief + figma_url
--
-- Background
-- ──────────
-- Brief + figmaUrl used to live on each deliverable (per-card). Team
-- needed the brief to be visible on EVERY card on a project so the
-- strategist writes once + designer/dev/QA see it without hopping
-- back to the strategy card.
--
-- Promoted to project-level. Edited from any card popup; the change
-- propagates to every card on that project.
--
-- Existing deliverable.brief + deliverable.figma_url stay (kanban_tasks
-- columns) for backwards compat with cards that have their own
-- override; the my-work popup reads the project-level value.
--
-- Apply manually in Supabase SQL Editor (per project rule).
-- ═══════════════════════════════════════════════════════════════════

alter table public.kanban_projects
  add column if not exists brief text,
  add column if not exists figma_url text;

comment on column public.kanban_projects.brief is
  'Project-level strategy brief (URL or freeform text). Surfaced on every card belonging to this project.';
comment on column public.kanban_projects.figma_url is
  'Project-level Figma URL - one design file shared across every card on the project.';
