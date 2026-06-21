-- ── Sales Pipeline (Lead) ──────────────────────────────────────
-- The 3 paths in (upsell / warm / cold-via-audit) per the Hero
-- Offer playbook (Acquisition / Sales motion). One JSONB blob per
-- lead. Pipeline rules (speed-to-lead, 7-day close, finite
-- follow-up cadence) are enforced in UI, not at the schema layer.
-- ───────────────────────────────────────────────────────────────

create table if not exists leads (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_updated_at_idx on leads (updated_at desc);

alter table leads enable row level security;

create policy if not exists "anon read leads"
  on leads for select to anon using (true);
create policy if not exists "anon write leads"
  on leads for all   to anon using (true) with check (true);
