-- ── Briefs (design / dev / hypothesis) ─────────────────────────
-- One row per brief, kind enum lives in the JSONB. Output renders
-- as a shareable doc-style page at /brief-output/[slug].
-- ───────────────────────────────────────────────────────────────

create table if not exists briefs (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists briefs_updated_at_idx on briefs (updated_at desc);

alter table briefs enable row level security;

create policy if not exists "anon read briefs"
  on briefs for select to anon using (true);
create policy if not exists "anon write briefs"
  on briefs for all   to anon using (true) with check (true);
