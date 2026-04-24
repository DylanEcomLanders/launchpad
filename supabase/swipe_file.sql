-- Run this in the Supabase SQL editor.
-- Design swipe file — URLs + cached desktop/mobile screenshots.

create table if not exists public.swipe_file (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text not null default '',
  tags text[] not null default '{}',
  notes text not null default '',
  desktop_url text not null default '',
  mobile_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists swipe_file_created_idx on public.swipe_file (created_at desc);

alter table public.swipe_file enable row level security;

-- Read + write via anon key (team-only tool, same pattern as task_board)
drop policy if exists "swipe_file_public_read" on public.swipe_file;
create policy "swipe_file_public_read"
  on public.swipe_file
  for select
  using (true);

drop policy if exists "swipe_file_public_write" on public.swipe_file;
create policy "swipe_file_public_write"
  on public.swipe_file
  for all
  using (true)
  with check (true);

-- Storage bucket for cached screenshots
insert into storage.buckets (id, name, public)
values ('swipe-file', 'swipe-file', true)
on conflict (id) do nothing;

-- Allow anon read + write to the bucket (team-only tool, no client exposure)
drop policy if exists "swipe_file_storage_read" on storage.objects;
create policy "swipe_file_storage_read"
  on storage.objects
  for select
  using (bucket_id = 'swipe-file');

drop policy if exists "swipe_file_storage_write" on storage.objects;
create policy "swipe_file_storage_write"
  on storage.objects
  for insert
  with check (bucket_id = 'swipe-file');

drop policy if exists "swipe_file_storage_delete" on storage.objects;
create policy "swipe_file_storage_delete"
  on storage.objects
  for delete
  using (bucket_id = 'swipe-file');
