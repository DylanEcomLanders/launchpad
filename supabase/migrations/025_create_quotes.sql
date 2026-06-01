-- 025_create_quotes.sql
-- Standalone quote tool (separate from the older `proposals` tier-link system).
-- Admin composes a quote with free-form line items in /tools/quotes; it
-- generates a tokened public HTML page at /quote/<token> the client can view.
--
-- Storage convention: {id, data jsonb, ...} like the rest of the app. The
-- whole quote (client, intro, line items, totals) lives in `data`. `token` is
-- the unguessable public URL key. `viewed_at` is stamped when the client opens
-- it. `trashed_at` for soft-delete.
--
-- NOTE: migrations are NOT auto-applied — paste this into the Supabase SQL
-- editor (see project_supabase_migrations memory).

create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  data        jsonb not null,
  viewed_at   timestamptz,
  created_at  timestamptz not null default now(),
  trashed_at  timestamptz
);

create index if not exists quotes_token_idx on quotes (token);
create index if not exists quotes_created_idx on quotes (created_at desc);

-- RLS: same posture as the rest of the app — anon client may read/write; the
-- token is the access control for the public page, and the admin builder is
-- gated at the app layer.
alter table quotes enable row level security;
drop policy if exists quotes_all on quotes;
create policy quotes_all on quotes for all to anon using (true) with check (true);
