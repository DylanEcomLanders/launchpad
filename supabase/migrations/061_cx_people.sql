-- 061_cx_people.sql
-- CX Delivery: the small team roster you assign cards to (strategist / designer /
-- developer). Part of the isolated client-experience area (src/lib/cx) - shares
-- nothing with the legacy people/pod-member tables.
--
-- Generic-store pattern: { id text pk, data jsonb, created_at, updated_at }.
-- Record shape in src/lib/cx/types.ts: { name, role }. App-layer auth
-- (permissive RLS), same posture as the other cx_* stores.
--
-- Until pasted the roster runs localStorage-only (src/lib/cx/data.ts degrades
-- silently). NOT destructive. Review + back up before pasting.

create table if not exists cx_people (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cx_people enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cx_people' and policyname = 'cx_people_all') then
    create policy cx_people_all on cx_people for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
