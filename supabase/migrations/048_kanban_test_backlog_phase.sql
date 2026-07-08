-- 048: add the "test-backlog" phase (Test queue column)
--
-- The Optimisation band grows a second column: Test queue (queued hypotheses /
-- next tests) feeding Live tests. Additive: extends the phase CHECK constraint
-- on kanban_tasks; no data rewrites, nothing renamed (column relabels are
-- display-only in the app).
--
-- Paste into the Supabase SQL editor manually. Reversible: re-add the old
-- constraint (no rows will hold the new value until the UI writes one).

alter table kanban_tasks drop constraint if exists kanban_tasks_phase_check;
alter table kanban_tasks add constraint kanban_tasks_phase_check check (
  phase in (
    'tickets', 'documents', 'not-started', 'strategy', 'design',
    'internal-revisions', 'external-revisions', 'development', 'qa',
    'test-backlog', 'launch-testing'
  )
);
