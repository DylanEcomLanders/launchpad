-- Run this in the Supabase SQL editor.
-- Roadmap items for Conversion Engine portals.

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.client_portals(id) on delete cascade,

  title text not null,
  description text not null default '',
  impact_hypothesis text not null default '',

  stage text not null default 'backlog',
  priority text not null default 'medium',

  target_month text not null default '',
  sort_index integer not null default 0,

  figma_url text not null default '',
  staging_url text not null default '',
  live_url text not null default '',

  outcome text not null default '',

  started_at timestamptz,
  shipped_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_items_portal_idx on public.roadmap_items (portal_id);
create index if not exists roadmap_items_stage_idx on public.roadmap_items (stage);

alter table public.roadmap_items enable row level security;

-- Public read so the client portal view can render the roadmap anonymously via token.
drop policy if exists "roadmap_items_public_read" on public.roadmap_items;
create policy "roadmap_items_public_read"
  on public.roadmap_items
  for select
  using (true);

-- Writes happen via the anon key from the admin UI (same pattern as client_portals).
drop policy if exists "roadmap_items_public_write" on public.roadmap_items;
create policy "roadmap_items_public_write"
  on public.roadmap_items
  for all
  using (true)
  with check (true);
