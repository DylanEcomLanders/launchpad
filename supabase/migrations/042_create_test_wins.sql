-- ── Test wins (case study capture inbox) ──────────────────────
-- Lightweight capture of every winning test as it concludes.
-- Sits ahead of the editorial case_studies table - admin promotes
-- selected wins into full case studies when ready.
-- ───────────────────────────────────────────────────────────────

create table if not exists test_wins (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists test_wins_updated_at_idx on test_wins (updated_at desc);

alter table test_wins enable row level security;

drop policy if exists "anon read test_wins" on test_wins;
create policy "anon read test_wins" on test_wins for select to anon using (true);
drop policy if exists "anon write test_wins" on test_wins;
create policy "anon write test_wins" on test_wins for all   to anon using (true) with check (true);
