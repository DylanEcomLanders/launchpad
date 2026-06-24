-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: kanban_projects gets manual Phase 1 / Phase 2 deadlines
--
-- Background
-- ──────────
-- start_date + turnaround_days computed per-phase due dates via a
-- cumulative day budget (Strategy → Design → Internal Rev → External
-- Rev for Phase 1, anchored to clientApprovedAt for Phase 2). Works
-- when the team can pace themselves, but breaks when an externally
-- imposed deadline (campaign launch, event, hard cutoff) drives the
-- timeline.
--
-- Add per-bucket manual deadlines so admin can pin Phase 1 / Phase 2
-- end dates directly. When set, they override the computed per-phase
-- due dates for stuck/approaching/on-track on every card in that
-- bucket. When null, fall back to the original computed logic.
--
-- Apply manually in Supabase SQL Editor (per project rule).
-- ═══════════════════════════════════════════════════════════════════

alter table public.kanban_projects
  add column if not exists phase1_deadline date,
  add column if not exists phase2_deadline date;

comment on column public.kanban_projects.phase1_deadline is
  'Manual Phase 1 client deadline (strategy / design / int-rev / ext-rev). Overrides computed per-phase due dates when set.';
comment on column public.kanban_projects.phase2_deadline is
  'Manual Phase 2 client deadline (dev / qa / launch). Overrides computed per-phase due dates when set.';
