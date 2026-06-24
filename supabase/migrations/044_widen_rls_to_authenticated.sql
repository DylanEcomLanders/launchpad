-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: widen RLS policies to authenticated role
--
-- Background
-- ──────────
-- All `*_create_*.sql` migrations create RLS policies as:
--
--   create policy <name> on <table> for all to anon using (true) with check (true);
--
-- Worked fine while no user signed in to Supabase Auth (every
-- request used the anon role + policy applied). Broke the moment we
-- shipped the admin-direct credentials flow (`set-user-credentials`)
-- because users now have real Supabase Auth sessions and every
-- request goes through as the `authenticated` role. The anon-only
-- policy doesn't apply → RLS denies → silent failures across the
-- app (kanban writes from 21 June 13:38 onwards dropped on the
-- floor).
--
-- Diagnostic confirmed via direct curl with the anon key: writes
-- succeed when no JWT is attached (anon) and fail when one is
-- (authenticated). 24 June 2026.
--
-- Fix
-- ───
-- Re-create every "for all to anon" policy as "for all to anon,
-- authenticated" so logged-in app users get the same access. The
-- app continues to gate access at the UI / cookie level; RLS
-- mirrors the same posture (any caller with the anon key OR a
-- valid session can read/write).
--
-- Tighten later if a per-row access model is needed - for now,
-- match the existing security posture so day-to-day stops breaking.
--
-- Apply manually in Supabase SQL Editor (per project rule, migrations
-- are not auto-run).
-- ═══════════════════════════════════════════════════════════════════

-- Helper: redefine a single policy from anon-only to anon+authenticated.
-- Use a DO block so we can iterate over every table-policy pair without
-- pasting 30 near-identical statements.

do $$
declare
  r record;
begin
  for r in
    select
      schemaname,
      tablename,
      policyname
    from pg_policies
    where schemaname = 'public'
      and roles = '{anon}'         -- ONLY anon, no other role
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
    execute format(
      'create policy %I on %I.%I for all to anon, authenticated using (true) with check (true)',
      r.policyname, r.schemaname, r.tablename
    );
    raise notice 'Widened policy % on %.%', r.policyname, r.schemaname, r.tablename;
  end loop;
end $$;

-- Verification query - run this after to confirm every public table's
-- policies now include 'authenticated':
--
-- select schemaname, tablename, policyname, roles
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename;
