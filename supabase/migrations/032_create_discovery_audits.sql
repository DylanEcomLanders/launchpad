-- ── Discovery Audit (paid pre-signup audit) ────────────────────
-- The £1,000 warm-lead audit the strategist runs in 72 hours.
-- Follows the deck structure in the Hero Offer playbook
-- (Execution / Discovery Audit). Output is a shareable branded
-- HTML page at /audit-output/[id].
--
-- One JSONB blob per audit so adding a slide / field is a
-- TypeScript-only change. Matches the offer_* / kanban_* pattern.
-- ───────────────────────────────────────────────────────────────

create table if not exists discovery_audits (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists discovery_audits_updated_at_idx
  on discovery_audits (updated_at desc);

alter table discovery_audits enable row level security;

-- Anon access matches the rest of the launchpad surface; admin auth
-- is enforced in the app, not at the row level.
drop policy if exists "anon read discovery_audits" on discovery_audits;
create policy "anon read discovery_audits" on discovery_audits for select to anon using (true);
drop policy if exists "anon write discovery_audits" on discovery_audits;
create policy "anon write discovery_audits" on discovery_audits for all   to anon using (true) with check (true);
