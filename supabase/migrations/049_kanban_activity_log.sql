-- 049: kanban activity log (who did what, when)
--
-- Append-only feed for the board. Every meaningful human action (move,
-- create, delete, conclude a test, submit a handover) writes one row here
-- so the team can answer "who moved this, and when" without opening a card.
--
-- Card-centric but denormalised on purpose: card_title / client_name /
-- project_name are copied in at write time so the feed still reads clearly
-- after the underlying card is deleted or renamed. from_phase / to_phase are
-- plain text (not FK'd to the phase enum) so relabels never break history.
--
-- Additive only. Paste into the Supabase SQL editor manually (migrations are
-- not auto-applied). Reversible: drop the table.

create table if not exists kanban_activity (
  id           text primary key,
  actor        text not null,
  action       text not null,          -- moved | created | deleted | concluded_test | submitted_handover
  card_id      text,                   -- nullable: a create logs before the id is stable; a delete outlives it
  card_title   text not null,
  client_name  text,
  project_name text,
  from_phase   text,
  to_phase     text,
  detail       text,                   -- freeform, e.g. a test outcome summary
  created_at   timestamptz not null default now()
);

create index if not exists kanban_activity_created_at_idx
  on kanban_activity (created_at desc);

-- Same posture as the rest of the kanban tables: RLS on, anon allowed.
-- (The app gates writes by the launchpad-role cookie in the UI; the DB is
-- open to anon. Tighten alongside the other kanban_* policies when the
-- per-role read model lands.)
alter table kanban_activity enable row level security;

drop policy if exists kanban_activity_all on kanban_activity;

create policy kanban_activity_all on kanban_activity
  for all to anon using (true) with check (true);
