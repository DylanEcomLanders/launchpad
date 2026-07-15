-- 051: card subtasks (granular execution steps within a card)
--
-- Additive only. One JSONB column on kanban_tasks:
--
--   subtasks  jsonb  Ordered array of subtasks. Each:
--                    { id, title, role, unlock, done, doneAt }
--                    - role: primary_designer | secondary_designer |
--                      primary_dev | secondary_dev (resolves to a name via the
--                      pod roster at render time; not stored as a name).
--                    - unlock: sequential (available once every earlier subtask
--                      is done) | client_approval (held until the card clears
--                      client review).
--                    Status (locked | available | done) is DERIVED in the app,
--                    never stored.
--
-- Subtasks are advisory: they never force a phase move (the handoff gates do
-- that). Paste into the Supabase SQL editor manually. Reversible: drop the
-- column.

alter table kanban_tasks
  add column if not exists subtasks jsonb;
