-- Run this in the Supabase SQL editor.
-- Font library — curated approved fonts for the team.
--
-- Each row is one font family. Files are stored as a JSONB array on the row
-- (one entry per weight/style upload) and the actual font binaries live in
-- the `font-library` storage bucket.

create table if not exists public.font_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family text not null,
  category text not null,                  -- 'sans' | 'serif' | 'display' | 'script' | 'monospace'
  usage text[] not null default '{}',      -- ['heading', 'body', 'display', 'ui']
  niches text[] not null default '{}',     -- ['beauty', 'wellness', ...]
  notes text not null default '',
  google_fonts_url text not null default '',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists font_library_created_idx on public.font_library (created_at desc);
create index if not exists font_library_name_idx on public.font_library (name);

alter table public.font_library enable row level security;

-- Read + write via anon key (team-only tool, behind AuthGate)
drop policy if exists "font_library_public_read" on public.font_library;
create policy "font_library_public_read"
  on public.font_library
  for select
  using (true);

drop policy if exists "font_library_public_write" on public.font_library;
create policy "font_library_public_write"
  on public.font_library
  for all
  using (true)
  with check (true);

-- Storage bucket for the actual font binaries
insert into storage.buckets (id, name, public)
values ('font-library', 'font-library', true)
on conflict (id) do nothing;

drop policy if exists "font_library_storage_read" on storage.objects;
create policy "font_library_storage_read"
  on storage.objects
  for select
  using (bucket_id = 'font-library');

drop policy if exists "font_library_storage_write" on storage.objects;
create policy "font_library_storage_write"
  on storage.objects
  for insert
  with check (bucket_id = 'font-library');

drop policy if exists "font_library_storage_delete" on storage.objects;
create policy "font_library_storage_delete"
  on storage.objects
  for delete
  using (bucket_id = 'font-library');
