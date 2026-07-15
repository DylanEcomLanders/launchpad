-- 055_results_engine.sql
-- Results Engine spine: the surfaces created at go-live and the single, canonical
-- test record. This is the "one place a test lives" the rework mandates — the
-- board's testResult/tests[] and the legacy ab_tests store both migrate INTO this
-- (data migration is a SEPARATE, later migration; this only creates the schema).
--
-- Follows the repo's generic-store pattern (see 037_create_tests / createStore):
-- { id text pk, data jsonb, created_at, updated_at }. The record shape lives in
-- app types (src/lib/results-engine/types.ts). Invariants that a typed schema
-- would express as CHECKs — a win needs a recorded declaration (§6), the client
-- face is a curated gated subset (§7) — are enforced in the data layer, matching
-- the app's app-layer-auth posture (permissive RLS, launchpad-role cookie).
--
-- NOT destructive. Review + back up before pasting into the Supabase SQL editor.

create table if not exists results_surfaces (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tests (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table results_surfaces enable row level security;
alter table tests            enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'results_surfaces' and policyname = 'results_surfaces_all') then
    create policy results_surfaces_all on results_surfaces for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tests' and policyname = 'tests_all') then
    create policy tests_all on tests for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
