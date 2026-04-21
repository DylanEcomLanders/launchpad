-- Run this in the Supabase SQL editor.
-- Adds the miro_board_url column so the Funnels tab can persist a Miro board link per portal.

alter table public.client_portals
  add column if not exists miro_board_url text;
