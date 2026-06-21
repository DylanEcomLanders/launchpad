-- 028_create_sales_dashboard_tables.sql
--
-- Sales Dashboard module. Backs /sales (unified inbox + pipeline + revenue
-- attribution + alerts) and creates the shared `clients` spine that the
-- KPI and Retention dashboards will run on.
--
-- ⚠️  NOT AUTO-APPLIED. Paste into the Supabase SQL editor to run (same as
--     every other migration in this folder — see 024's header).
--
-- CONVENTION NOTE / DEVIATION FROM BRIEF:
--   The brief specifies a normalized relational model (typed columns + FKs +
--   probability ints, etc.). This repo's established convention (pods_v2,
--   finance, sales-engine) is the opposite: every table is
--     { id TEXT PK, data JSONB, updated_at TIMESTAMPTZ }
--   driven by createStore (Supabase-first + localStorage fallback) with
--   permissive `FOR ALL TO anon` RLS; auth is enforced in-app via the
--   launchpad-role cookie, NOT via auth.uid() row filters. Per the brief's
--   instruction ("where this conflicts with conventions, follow the
--   conventions and note the deviation"), we follow the JSONB-blob pattern.
--   The relational shape lives as TypeScript interfaces in
--   src/lib/sales-dashboard/types.ts; the JSONB `data` column holds every
--   field except `id`. FKs (owner_id, stage_id, lead_id, pod_id) are plain
--   string ids inside the blob, not enforced relations.
--
--   `clients` here is the NEW sales/retention spine and is named
--   `sales_clients` to avoid colliding with the existing `pods_v2_clients`
--   (delivery lifecycle) and `finance_clients` (billing) tables. The
--   Retention dashboard should read `sales_clients`.

create table if not exists sales_pipeline_stages (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists sales_leads (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists sales_lead_messages (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists sales_lead_tasks (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists sales_deals (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists sales_clients (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Change-detection indexes (mirror the pods_v2 pattern).
create index if not exists sales_pipeline_stages_updated_idx on sales_pipeline_stages (updated_at desc);
create index if not exists sales_leads_updated_idx           on sales_leads (updated_at desc);
create index if not exists sales_lead_messages_updated_idx   on sales_lead_messages (updated_at desc);
create index if not exists sales_lead_tasks_updated_idx      on sales_lead_tasks (updated_at desc);
create index if not exists sales_deals_updated_idx           on sales_deals (updated_at desc);
create index if not exists sales_clients_updated_idx         on sales_clients (updated_at desc);

-- Dedupe inbound messages by provider id (external_id lives in the blob).
create index if not exists sales_lead_messages_external_idx
  on sales_lead_messages ((data->>'external_id'));

-- RLS: permissive anon (app-level auth via launchpad-role cookie), matching
-- the rest of the app. See 011_create_pods_v2_tables.sql.
alter table sales_pipeline_stages enable row level security;
alter table sales_leads           enable row level security;
alter table sales_lead_messages   enable row level security;
alter table sales_lead_tasks      enable row level security;
alter table sales_deals           enable row level security;
alter table sales_clients         enable row level security;

create policy "sales_pipeline_stages_all" on sales_pipeline_stages for all to anon using (true) with check (true);
create policy "sales_leads_all"           on sales_leads           for all to anon using (true) with check (true);
create policy "sales_lead_messages_all"   on sales_lead_messages   for all to anon using (true) with check (true);
create policy "sales_lead_tasks_all"      on sales_lead_tasks      for all to anon using (true) with check (true);
create policy "sales_deals_all"           on sales_deals           for all to anon using (true) with check (true);
create policy "sales_clients_all"         on sales_clients         for all to anon using (true) with check (true);
