-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Hero Offer playbook
--
-- Six tables backing the Hero Offer house at /hero-offer. The agency's
-- single source of truth for: how to pitch (Acquisition), how to
-- deliver the conversion engine (Execution), how to keep clients on
-- the books (Retention). Knowledge house, NOT a live dashboard.
--
-- All tables use the { id, data jsonb, updated_at } pattern that
-- matches every other editable-content store in launchpad
-- (offer_content_overrides, kanban_*, pods_v2_*). Keeps the data
-- layer one tiny createStore() call per table.
--
-- Apply manually in Supabase SQL Editor. Per project rule, migrations
-- here are NOT auto-run. Idempotent via "if not exists" so re-runs
-- are safe.
-- ═══════════════════════════════════════════════════════════════════

-- ─── offer_sections ────────────────────────────────────────────────────────
-- Editable markdown sections for the Start here / Acquisition /
-- Retention guidance pages. data carries { stage, title, body, order,
-- owner }. body is plain markdown. stage is one of: start, acquisition,
-- retention. order is a sortable integer.
create table if not exists offer_sections (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── offer_objections ──────────────────────────────────────────────────────
-- Objection + response library for Acquisition. data carries
-- { objection, response, order }. Read in scannable Q&A list on the
-- Acquisition tab.
create table if not exists offer_objections (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── offer_layers ──────────────────────────────────────────────────────────
-- Structured spec for Execution: one row per conversion-engine layer.
-- data carries { name, included, deliverables, turnaround, bar, order,
-- owner }. Rendered as cards / a scannable table.
create table if not exists offer_layers (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── offer_milestones ──────────────────────────────────────────────────────
-- Retention lifecycle pages. data carries { day, title, body, order }.
-- day is one of 30 / 90 / 180 / 365. Free-form so the team can add
-- more touchpoints later without a migration.
create table if not exists offer_milestones (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── offer_resources ───────────────────────────────────────────────────────
-- Attached links anywhere in the playbook (deck, template, doc, SOP,
-- Loom). data carries { parent_type, parent_id, title, url, kind }.
-- parent_type is one of: section / layer / milestone / objection /
-- root (root = surfaced on the Start here index).
create table if not exists offer_resources (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── offer_pricing ─────────────────────────────────────────────────────────
-- Pricing tiers shown on the Acquisition tab. data carries { tier,
-- price, includes, order }. tier is free-form text so the team can
-- iterate the naming (Entry / Core / VIP today, who knows tomorrow).
-- includes is a list of strings.
create table if not exists offer_pricing (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
-- The pages always list ALL rows in a table (small N, sorted client-
-- side), so no per-column indexes beyond the implicit pk + the
-- updated_at sort that the rest of the codebase uses.
create index if not exists offer_sections_updated_idx   on offer_sections (updated_at desc);
create index if not exists offer_objections_updated_idx on offer_objections (updated_at desc);
create index if not exists offer_layers_updated_idx     on offer_layers (updated_at desc);
create index if not exists offer_milestones_updated_idx on offer_milestones (updated_at desc);
create index if not exists offer_resources_updated_idx  on offer_resources (updated_at desc);
create index if not exists offer_pricing_updated_idx    on offer_pricing (updated_at desc);

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Same posture as pods_v2_* + kanban_* + offer_content_overrides:
-- enable RLS, allow anon everything. App-level auth gates the writes
-- (Hero Offer is admin-edit, all-team-read; the gate lives in the
-- React layer via useRole(). RLS allowing all keeps the data layer
-- simple while the React layer enforces access).
alter table offer_sections   enable row level security;
alter table offer_objections enable row level security;
alter table offer_layers     enable row level security;
alter table offer_milestones enable row level security;
alter table offer_resources  enable row level security;
alter table offer_pricing    enable row level security;

drop policy if exists offer_sections_all   on offer_sections;
drop policy if exists offer_objections_all on offer_objections;
drop policy if exists offer_layers_all     on offer_layers;
drop policy if exists offer_milestones_all on offer_milestones;
drop policy if exists offer_resources_all  on offer_resources;
drop policy if exists offer_pricing_all    on offer_pricing;

create policy offer_sections_all   on offer_sections   for all to anon using (true) with check (true);
create policy offer_objections_all on offer_objections for all to anon using (true) with check (true);
create policy offer_layers_all     on offer_layers     for all to anon using (true) with check (true);
create policy offer_milestones_all on offer_milestones for all to anon using (true) with check (true);
create policy offer_resources_all  on offer_resources  for all to anon using (true) with check (true);
create policy offer_pricing_all    on offer_pricing    for all to anon using (true) with check (true);
