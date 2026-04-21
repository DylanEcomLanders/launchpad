-- Run this in the Supabase SQL editor.
-- Adds the funnel_documents column so the Funnels tab can persist uploaded docs per portal.

alter table public.client_portals
  add column if not exists funnel_documents jsonb default '[]'::jsonb;
