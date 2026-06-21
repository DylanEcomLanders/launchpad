-- ── Reports (weekly + monthly) ─────────────────────────────────
-- Auto-generated from tests + roadmaps + kanban for a client +
-- period. Strategist reviews + edits + sends. Public output at
-- /report-output/[slug].
-- ───────────────────────────────────────────────────────────────

create table if not exists reports (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reports_updated_at_idx on reports (updated_at desc);

alter table reports enable row level security;

create policy if not exists "anon read reports"
  on reports for select to anon using (true);
create policy if not exists "anon write reports"
  on reports for all   to anon using (true) with check (true);
