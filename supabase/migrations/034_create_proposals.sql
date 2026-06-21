-- ── Proposals ──────────────────────────────────────────────────
-- The branded proposal sent after the verbal yes. Tier, terms,
-- guarantee, prepay. Status flow: draft → sent → signed → paid →
-- kicked-off (or declined). One JSONB blob per proposal.
-- ───────────────────────────────────────────────────────────────

create table if not exists proposals (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists proposals_updated_at_idx
  on proposals (updated_at desc);

alter table proposals enable row level security;

create policy if not exists "anon read proposals"
  on proposals for select to anon using (true);
create policy if not exists "anon write proposals"
  on proposals for all   to anon using (true) with check (true);
