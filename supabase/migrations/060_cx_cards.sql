-- 060_cx_cards.sql
-- CX Delivery board: the fresh, isolated Trello-style kanban for the
-- client-experience area. Deliberately simple — cards move across stage columns
-- by drag; no gates, no automations. Shares NOTHING with the legacy kanban: its
-- own table, its own app namespace (src/lib/cx).
--
-- Follows the repo's generic-store pattern (see 059_pod_docs / createStore):
-- { id text pk, data jsonb, created_at, updated_at }. The record shape lives in
-- app types (src/lib/cx/types.ts): { title, clientId, clientName, stage,
-- primaryDesigner?, secondaryDesigner?, primaryDeveloper?, secondaryDeveloper?,
-- dueAt?, notes?, ... }. `clientId` references a pod_docs row (the Clients doc)
-- so that doc's Delivery reflection can pull its cards. App-layer auth
-- (permissive RLS, launchpad-role cookie), same posture as the other stores.
--
-- Until this is pasted the board runs localStorage-only (see src/lib/cx/data.ts —
-- reads/writes degrade silently when the table is absent). NOT destructive.
-- Review + back up before pasting into the SQL editor.

create table if not exists cx_cards (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cx_cards enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cx_cards' and policyname = 'cx_cards_all') then
    create policy cx_cards_all on cx_cards for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
