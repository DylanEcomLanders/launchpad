-- ── Client lifecycle milestones (Day 30/90/180/365) ────────────
-- One row per client × day. Drives Retention milestone tracking
-- against the playbook (Retention / Milestones).
-- ───────────────────────────────────────────────────────────────

create table if not exists client_milestones (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists client_milestones_updated_at_idx
  on client_milestones (updated_at desc);

alter table client_milestones enable row level security;

create policy if not exists "anon read client_milestones"
  on client_milestones for select to anon using (true);
create policy if not exists "anon write client_milestones"
  on client_milestones for all   to anon using (true) with check (true);
