-- Run this in the Supabase SQL editor.
-- Adds asset_type to roadmap_items so the retainer Deliverables kanban can show
-- tests / pages / upsells / other as distinct conversion asset types.

alter table public.roadmap_items
  add column if not exists asset_type text not null default 'test';
