-- 029_create_retention_tables.sql
--
-- Retention Dashboard module. Backs /retention (CSM home: client health,
-- churn-risk flags, renewal pipeline). Runs ON the `sales_clients` spine
-- created by 028 — it does NOT recreate or alter clients.
--
-- ⚠️  NOT AUTO-APPLIED. Paste into the Supabase SQL editor to run (same as
--     every other migration in this folder — see 024's / 028's headers).
--
-- CONVENTION NOTES / DEVIATIONS FROM BRIEF:
--   1. Data shape. The brief specifies a normalized relational model (typed
--      columns + FKs). This repo's established convention (pods_v2, finance,
--      sales 028) is the JSONB-blob pattern: { id, data, ... } driven by
--      createStore (Supabase-first + localStorage fallback) with permissive
--      `FOR ALL TO anon` RLS; auth is enforced in-app via the launchpad-role
--      cookie, NOT auth.uid() row filters. Per the brief ("follow the
--      conventions and note the deviation") we follow the blob pattern. The
--      relational shape lives as TypeScript interfaces in
--      src/lib/retention/types.ts; FKs (client_id) are plain string ids in
--      the blob, not enforced relations.
--
--   2. Timestamp columns. We declare BOTH `created_at` and `updated_at`.
--      The generic createStore (src/lib/supabase-store.ts) inserts and orders
--      by `created_at`, so it is REQUIRED for real Supabase persistence; a
--      table with only `updated_at` would silently fall back to localStorage.
--      `updated_at` + its DESC index match the pods_v2/rd/028 change-detection
--      convention. Belt and suspenders, on purpose.
--
--   3. `clients` is read-only here. The Retention dashboard reads
--      `sales_clients` (028). `health_override` is a NEW field but lives in
--      the existing `sales_clients.data` JSONB blob, so NO ALTER is needed —
--      it is a TypeScript-only addition (see types.ts) written through the
--      existing client store. This migration adds only the three NEW tables
--      the Retention module owns.

create table if not exists client_reviews (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists client_results (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists retention_tasks (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Change-detection indexes (mirror the pods_v2 / 028 pattern).
create index if not exists client_reviews_updated_idx  on client_reviews  (updated_at desc);
create index if not exists client_results_updated_idx  on client_results  (updated_at desc);
create index if not exists retention_tasks_updated_idx on retention_tasks (updated_at desc);

-- Filter-by-client indexes (every read groups by the client_id in the blob).
create index if not exists client_reviews_client_idx  on client_reviews  ((data->>'client_id'));
create index if not exists client_results_client_idx  on client_results  ((data->>'client_id'));
create index if not exists retention_tasks_client_idx on retention_tasks ((data->>'client_id'));

-- RLS: permissive anon (app-level auth via launchpad-role cookie), matching
-- the rest of the app. See 011_create_pods_v2_tables.sql / 028.
alter table client_reviews  enable row level security;
alter table client_results  enable row level security;
alter table retention_tasks enable row level security;

create policy "client_reviews_all"  on client_reviews  for all to anon using (true) with check (true);
create policy "client_results_all"  on client_results  for all to anon using (true) with check (true);
create policy "retention_tasks_all" on retention_tasks for all to anon using (true) with check (true);
