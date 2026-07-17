-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: the CSM satellite (renewal / MRR / cadence checklist)
--
-- Background
-- ──────────
-- /clients is a read-only projection of the canonical client spine
-- (kanban_clients → kanban_projects). The CSM's own numbers have no home
-- on that spine: renewal date, MRR, and the compliance + rhythm checklist
-- are entered per account by the CSM, not derived from delivery.
--
-- So they live on a satellite, keyed 1:1 by kanban_clients.id. Per-CLIENT,
-- not per-engagement: a client on a build AND a retainer has one renewal
-- date and one MRR, shared across both.
--
-- src/lib/client-csm/store.ts has been reading and writing this table
-- through createStore (Supabase, with a localStorage fallback) since the
-- /clients repoint -- but the table was never created, so every CSM write
-- has been silently falling back to localStorage. That means the numbers
-- live in ONE browser: invisible to anyone else, and gone with the cache.
--
-- Apply manually in Supabase SQL Editor (per project rule).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.client_csm (
  -- = kanban_clients.id. Text, matching the spine's id type.
  id            text primary key,
  renewal_date  date,
  -- CSM-entered monthly figure for the client's active retainer. Belongs to
  -- the retainer only; a build's value is its own one-off fee.
  mrr           numeric,
  -- The compliance spine + rhythm/renewal cadence items, with their state.
  -- Shape is owned by the app (ChecklistItem[]), so jsonb rather than a
  -- child table: it is read and written whole, never queried into.
  items         jsonb not null default '[]'::jsonb,
  -- Engagement start the cadence counts from. Falls back to project start.
  start_date    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.client_csm is
  'CSM-owned overlay on the canonical client (kanban_clients), keyed 1:1 by its id. Holds what delivery cannot derive: renewal date, MRR, and the cadence/compliance checklist. Per-client, shared across all of that client''s engagements.';
