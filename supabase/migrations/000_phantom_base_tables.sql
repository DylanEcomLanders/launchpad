-- ─────────────────────────────────────────────────────────────────────────
-- Phantom base tables
--
-- `client_portals` and `feedback` were originally created directly in the
-- live Supabase project and never captured as migrations, yet later
-- migrations ALTER them (002 adds client_portals.reports, others add
-- pod_id / video_url). A clean replay onto a fresh database therefore broke
-- at 002 with "relation client_portals does not exist".
--
-- This migration recreates their base shape (derived from how the app
-- inserts into them) so the full migration chain replays cleanly on a new
-- environment. Columns added by later migrations (reports, pod_id,
-- video_url) are intentionally omitted here and left to those migrations,
-- which use ADD COLUMN IF NOT EXISTS.
--
-- Runs first (000_) so the base tables exist before anything alters them.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── client_portals ───────────────────────────────────────────────────────
create table if not exists client_portals (
  id                text primary key,
  token             text,
  client_name       text,
  client_email      text,
  client_type       text default 'regular',
  project_type      text,
  current_phase     text,
  progress          integer default 0,
  next_touchpoint   jsonb default '{}'::jsonb,
  phases            jsonb default '[]'::jsonb,
  scope             jsonb default '[]'::jsonb,
  deliverables      jsonb default '[]'::jsonb,
  documents         jsonb default '[]'::jsonb,
  results           jsonb default '[]'::jsonb,
  wins              jsonb default '[]'::jsonb,
  show_results      boolean default false,
  slack_channel_url text,
  ad_hoc_requests   jsonb default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

-- ─── feedback ─────────────────────────────────────────────────────────────
create table if not exists feedback (
  id               text primary key,
  client_name      text not null,
  client_email     text,
  rating           integer,
  quality          integer,
  communication    integer,
  recommend_score  integer,
  testimonial      text,
  improvements     text,
  submitted_at     timestamptz not null default now()
);
