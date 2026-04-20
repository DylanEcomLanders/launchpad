-- Run this in the Supabase SQL editor.
-- Adds the internal Slack channel column so QA gate notifications actually post.

alter table public.client_portals
  add column if not exists slack_internal_channel_id text;
