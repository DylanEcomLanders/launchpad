-- ── Roadmaps (per-client 30/60/90 plan) ────────────────────────
-- One row per client. Items nested in the JSONB blob. Mirrors the
-- playbook's Execution / Roadmap and briefing section.
-- ───────────────────────────────────────────────────────────────

create table if not exists roadmaps (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists roadmaps_updated_at_idx on roadmaps (updated_at desc);

alter table roadmaps enable row level security;

create policy if not exists "anon read roadmaps"
  on roadmaps for select to anon using (true);
create policy if not exists "anon write roadmaps"
  on roadmaps for all   to anon using (true) with check (true);
