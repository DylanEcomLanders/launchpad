-- Run this in the Supabase SQL editor.
-- Team tackboard — shared sticky notes for goals, wins, reminders.

create table if not exists public.tackboard_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  author text not null default '',
  color text not null default 'yellow',
  x double precision not null default 10,
  y double precision not null default 10,
  rotation double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tackboard_notes enable row level security;

drop policy if exists "tackboard_notes_public_read" on public.tackboard_notes;
create policy "tackboard_notes_public_read" on public.tackboard_notes
  for select using (true);

drop policy if exists "tackboard_notes_public_write" on public.tackboard_notes;
create policy "tackboard_notes_public_write" on public.tackboard_notes
  for all using (true) with check (true);
