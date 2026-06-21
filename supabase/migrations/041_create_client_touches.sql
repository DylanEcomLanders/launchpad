-- ── Client touches (cadence log) ───────────────────────────────
-- One row per touch (slack / call / email / channel-msg). Drives
-- the at-risk dashboard - if a client goes quiet, that's a signal.
-- ───────────────────────────────────────────────────────────────

create table if not exists client_touches (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists client_touches_updated_at_idx
  on client_touches (updated_at desc);

alter table client_touches enable row level security;

create policy if not exists "anon read client_touches"
  on client_touches for select to anon using (true);
create policy if not exists "anon write client_touches"
  on client_touches for all   to anon using (true) with check (true);
