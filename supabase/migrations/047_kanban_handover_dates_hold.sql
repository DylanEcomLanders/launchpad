-- 047: design-to-dev handover gate + persist card timing fields
--
-- Additive only. Three columns on kanban_tasks:
--
--   design_handoff  jsonb   The submitted handover record. NULL = not
--                           submitted (the gate blocks moves into Phase 2
--                           build phases). Shape:
--                           { figmaUrl, loomUrl, fontFilesUrl, assetsUrl,
--                             notes, submittedAt, submittedBy }
--   start_date      date    Card-level actual start (retrofit context; the
--                           app has carried this since the retrofit-dates
--                           work but it never persisted).
--   on_hold         bool    Waiting-on-client clock freeze (same: existed in
--                           app state, never persisted).
--
-- Paste into the Supabase SQL editor manually (migrations are not
-- auto-applied). Reversible: drop the three columns.

alter table kanban_tasks
  add column if not exists design_handoff jsonb,
  add column if not exists start_date date,
  add column if not exists on_hold boolean not null default false;
