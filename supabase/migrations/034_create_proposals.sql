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

drop policy if exists "anon read proposals" on proposals;
create policy "anon read proposals" on proposals for select to anon using (true);
drop policy if exists "anon write proposals" on proposals;
create policy "anon write proposals" on proposals for all   to anon using (true) with check (true);
