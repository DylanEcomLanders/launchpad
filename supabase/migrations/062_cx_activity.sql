-- 062_cx_activity.sql
-- CX Delivery: the activity log - one row per card move (from stage, to stage,
-- who, when). Part of the isolated client-experience area (src/lib/cx).
--
-- Generic-store pattern: { id text pk, data jsonb, created_at, updated_at }.
-- Record shape in src/lib/cx/types.ts: { at, who?, cardId, cardTitle, from, to }.
-- App-layer auth (permissive RLS), same posture as the other cx_* stores.
--
-- Until pasted the log runs localStorage-only (src/lib/cx/data.ts degrades
-- silently). NOT destructive. Review + back up before pasting.

create table if not exists cx_activity (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cx_activity enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cx_activity' and policyname = 'cx_activity_all') then
    create policy cx_activity_all on cx_activity for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
