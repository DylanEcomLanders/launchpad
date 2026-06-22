-- ── Client onboardings (week-one wow) ──────────────────────────
-- One row per active engagement. Per-checklist-item progress drives
-- the Retention bulletproof-week-one motion.
-- ───────────────────────────────────────────────────────────────

create table if not exists client_onboardings (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists client_onboardings_updated_at_idx
  on client_onboardings (updated_at desc);

alter table client_onboardings enable row level security;

drop policy if exists "anon read client_onboardings" on client_onboardings;
create policy "anon read client_onboardings" on client_onboardings for select to anon using (true);
drop policy if exists "anon write client_onboardings" on client_onboardings;
create policy "anon write client_onboardings" on client_onboardings for all   to anon using (true) with check (true);
