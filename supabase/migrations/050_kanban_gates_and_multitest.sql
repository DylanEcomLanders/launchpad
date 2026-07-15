-- 050: two lightweight handoff gates + multiple test runs per card
--
-- Additive only. Three JSONB columns on kanban_tasks:
--
--   strategy_handoff  jsonb  Lightweight Strategy -> Design gate.
--                            { notes, submittedAt, submittedBy }. NULL = not
--                            submitted (blocks the card leaving Strategy).
--   dev_handoff       jsonb  Lightweight Development -> Launch gate.
--                            { notes, submittedAt, submittedBy }. NULL = not
--                            submitted (blocks the card leaving Development).
--   tests             jsonb  Ordered array of test runs against the page.
--                            Each run: { id, label, liveTestUrl, liveStartedAt,
--                            metrics, interimNotes, screenshot, result }. The
--                            existing singular test columns (live_test_url,
--                            live_started_at, metrics, interim_notes,
--                            screenshot_url, test_result) mirror the ACTIVE
--                            (last) run, so every existing reader keeps working.
--
-- Paste into the Supabase SQL editor manually (migrations are not
-- auto-applied). Reversible: drop the three columns.

alter table kanban_tasks
  add column if not exists strategy_handoff jsonb,
  add column if not exists dev_handoff jsonb,
  add column if not exists tests jsonb;
