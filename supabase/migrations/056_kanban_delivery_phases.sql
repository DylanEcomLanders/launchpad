-- 056_kanban_delivery_phases.sql
-- Delivery/optimisation rework: widen the kanban_tasks.phase CHECK to allow the
-- three new delivery-board phases — client-approval, launch, done. Nothing is
-- removed: test-backlog + launch-testing stay valid so existing rows keep their
-- phase through the transition (those cards move to the Results Engine as data
-- migrates; they're just no longer rendered as delivery-board columns).
--
-- NOT destructive to data — only swaps a CHECK constraint. Review + back up
-- before pasting into the Supabase SQL editor.

alter table kanban_tasks drop constraint if exists kanban_tasks_phase_check;

alter table kanban_tasks
  add constraint kanban_tasks_phase_check check (
    phase in (
      'tickets',
      'documents',
      'not-started',
      'strategy',
      'design',
      'internal-revisions',
      'external-revisions',
      'development',
      'qa',
      'client-approval',   -- NEW: second client-hold
      'launch',            -- NEW: go-live; fires the seam
      'done',              -- NEW: delivered/live terminal
      'test-backlog',      -- kept (off-board; Results Engine)
      'launch-testing'     -- kept (off-board; Results Engine)
    )
  );
