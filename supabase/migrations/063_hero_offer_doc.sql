-- 063_hero_offer_doc.sql
-- Offer overview: the Offer front page is now a single editable TipTap document
-- (one row, id "main") the team amends in place instead of asking for a code
-- change. The stage decks stay their own structured tools.
--
-- Generic-store pattern: { id text pk, data jsonb, created_at, updated_at }.
-- Record shape (src/lib/hero-offer/offer-doc.ts): { html }. App-layer auth
-- (permissive RLS), same posture as the other stores.
--
-- Until pasted the doc runs localStorage-only (offer-doc.ts degrades silently).
-- NOT destructive. Review + back up before pasting.

create table if not exists hero_offer_doc (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hero_offer_doc enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hero_offer_doc' and policyname = 'hero_offer_doc_all') then
    create policy hero_offer_doc_all on hero_offer_doc for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
