-- 064_checkouts.sql
-- Agreement Checkout: one row per client deal, carrying the sign + pay + invoice
-- flow. A public token link (/checkout/[token]) lets the client sign and pay;
-- everything is logged here. Signature + invoice are in-house; the pay step uses
-- Whop. VAT is tagged by billing country (off until we register).
--
-- Generic-store pattern: { id text pk, data jsonb, created_at, updated_at }.
-- Record shape lives in src/lib/checkout/types.ts. Read publicly by token (the
-- client is unauthenticated), so RLS is permissive like the other stores; the
-- token itself is the unguessable secret. NOT destructive.

create table if not exists checkouts (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table checkouts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'checkouts' and policyname = 'checkouts_all') then
    create policy checkouts_all on checkouts for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
