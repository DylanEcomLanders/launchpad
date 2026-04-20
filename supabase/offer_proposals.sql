-- Run this in the Supabase SQL editor to create the offer_proposals table.

create table if not exists public.offer_proposals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand_name text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offer_proposals_slug_idx on public.offer_proposals (slug);
create index if not exists offer_proposals_created_at_idx on public.offer_proposals (created_at desc);

alter table public.offer_proposals enable row level security;

-- Public read so /proposal/[slug] can render anonymously
drop policy if exists "offer_proposals_public_read" on public.offer_proposals;
create policy "offer_proposals_public_read"
  on public.offer_proposals
  for select
  using (true);

-- Internal writes go through service role / API routes; no anon write policy.
