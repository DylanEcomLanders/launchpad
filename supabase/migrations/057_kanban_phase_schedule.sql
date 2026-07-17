-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: the build schedule moves onto the card, typed by the PM
--
-- Background
-- ──────────
-- Deadlines were derived in TWO places, from the same two inputs, and
-- they disagreed:
--
--   1. PHASE_DAYS_BY_TURNAROUND + phaseInternalDueDate() dated each
--      COLUMN off start_date (Phase 1) / client_approved_at (Phase 2).
--   2. SUBTASK_TEMPLATE.days + subtaskDeadline() dated each CHECKLIST
--      STEP off start_date.
--
-- Design was day 4 in the first and day 3 in the second. Nothing
-- reconciled them, so the card face and the checklist could show
-- different dates for the same work.
--
-- Both cascades are deleted. A schedule guessed from a day budget was
-- never as good as the one the PM already knows, so the PM types it:
-- one date per column, per card. The map is literal -- a card sitting in
-- Design compares itself to phase_deadlines->>'design' and goes red once
-- it passes. No anchoring, no scaling, no cumulative maths.
--
-- Shape: { "strategy": "2026-07-22", "design": "2026-07-27", ... }
-- Keys are PreviewPhase values; a missing key = an undated column, which
-- reads neutral and never goes red (so half-planned cards don't flood the
-- board). The card's overall due date derives from the "launch" key.
--
-- turnaround_days survives as a COMPARISON only ("planned 17 · contracted
-- 15") -- nothing computes from it anymore.
--
-- kanban_projects.phase1_deadline / phase2_deadline (migration 045) are
-- untouched: those are project-level client commitments, not this card's
-- internal plan.
--
-- Apply manually in Supabase SQL Editor (per project rule).
-- ═══════════════════════════════════════════════════════════════════

alter table public.kanban_tasks
  add column if not exists phase_deadlines jsonb;

comment on column public.kanban_tasks.phase_deadlines is
  'The build schedule, typed by the PM: one ISO date per column, keyed by phase ("design": "2026-07-27"). THE source for when this card is due in any column -- nothing is computed from start_date + turnaround_days anymore. A missing key = undated column = neutral, never late. The card''s overall due date is the "launch" key.';
