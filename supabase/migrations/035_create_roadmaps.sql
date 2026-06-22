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

drop policy if exists "anon read roadmaps" on roadmaps;
create policy "anon read roadmaps" on roadmaps for select to anon using (true);
drop policy if exists "anon write roadmaps" on roadmaps;
create policy "anon write roadmaps" on roadmaps for all   to anon using (true) with check (true);
