-- ── A/B Tests tracker ──────────────────────────────────────────
-- Every live test in one place. Hypothesis, runtime, significance,
-- result, write-up. Drives the conversion engine reporting.
-- ───────────────────────────────────────────────────────────────

create table if not exists ab_tests (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ab_tests_updated_at_idx on ab_tests (updated_at desc);

alter table ab_tests enable row level security;

drop policy if exists "anon read ab_tests" on ab_tests;
create policy "anon read ab_tests" on ab_tests for select to anon using (true);
drop policy if exists "anon write ab_tests" on ab_tests;
create policy "anon write ab_tests" on ab_tests for all   to anon using (true) with check (true);
