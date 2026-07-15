-- 053: token meter (commercial layer, Slice 1)
--
-- Additive. A thin, PASSIVE measurement layer over the delivery board: it
-- records an engagement's tier + monthly token pool and links each card to the
-- pool period (cycle) it is billed against. It NEVER gates delivery - the app
-- shows overage when a pool is exhausted, it never blocks card creation or a
-- phase move.
--
-- Follows the existing kanban convention: text columns with CHECK constraints
-- (not native pg enums, see 048's phase constraint), and the same open RLS
-- policy the other kanban tables use (for all to anon, authenticated using
-- (true) with check (true) - see 044). Hardening is a separate, deferred task.
--
-- Paste into the Supabase SQL editor manually, after 052. Reversible: drop the
-- three added columns, drop the cycles table.
--
-- NOTE on the project_id type: the spec sketched cycles.project_id as uuid, but
-- kanban_projects.id is `text` (see 030). A foreign key must match its target's
-- type, so project_id is `text` here. cycles.id + kanban_tasks.cycle_id are
-- genuine uuids.

-- ── Commercial fields on the project ────────────────────────────────────────
alter table kanban_projects
  add column if not exists tier text
    check (tier in ('audit','single_build','lite','core','growth','scale')),
  add column if not exists mrr numeric,
  add column if not exists engagement_status text
    check (engagement_status in ('pending','active','paused','completed','churned'));

-- ── Cycles: one pool period (calendar month) per retainer project ───────────
-- Consumption is NOT stored here; it is derived in the app by summing the token
-- cost of the cards stamped with each cycle's id. pool_rolled_in / pool_rolled_out
-- support rollover, whose month-close automation is a later slice (stays 0 now).
create table if not exists cycles (
  id               uuid primary key,
  project_id       text not null references kanban_projects(id) on delete cascade,
  month_index      int not null,
  is_first_cycle   boolean not null default false,
  pool_total       int,
  pool_rolled_in   int not null default 0,
  pool_rolled_out  int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One open cycle per project per month.
create unique index if not exists cycles_project_month_idx
  on cycles (project_id, month_index);

-- Keep updated_at fresh on every UPDATE (reuses the shared kanban trigger fn).
drop trigger if exists cycles_touch_updated_at on cycles;
create trigger cycles_touch_updated_at
  before update on cycles
  for each row execute function kanban_touch_updated_at();

-- ── Card sizing + cycle link ────────────────────────────────────────────────
-- size drives the token cost (derived in the app via tokenCostForSize, never
-- stored). cycle_id is stamped at creation for retainer cards; on delete the
-- card simply drops out of the derived sum (no refund logic).
alter table kanban_tasks
  add column if not exists size text
    check (size in ('core','secondary','tertiary','test')),
  add column if not exists cycle_id uuid references cycles(id) on delete set null;

-- ── RLS: same open posture as the other kanban tables ───────────────────────
alter table cycles enable row level security;
drop policy if exists cycles_all on cycles;
create policy cycles_all on cycles
  for all to anon, authenticated using (true) with check (true);
