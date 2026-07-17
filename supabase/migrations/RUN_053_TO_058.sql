-- ═══════════════════════════════════════════════════════════════
-- Launchpad: outstanding migrations 053 -> 058, in order.
--
-- Additive and idempotent throughout (add column / create table IF NOT
-- EXISTS, drop-then-create for policies and triggers), so it is safe to
-- re-run and safe against a database that already has some of them.
--
-- Requires kanban_touch_updated_at() to already exist (it does, from the
-- earlier kanban migrations). If Postgres complains that it is missing,
-- this database is behind on 001-052 - stop and say so.
--
-- Paste the whole thing into the Supabase SQL Editor and hit Run.
-- ═══════════════════════════════════════════════════════════════

-- ── 053_token_meter.sql ──
alter table kanban_projects
  add column if not exists tier text
    check (tier in ('audit','single_build','lite','core','growth','scale')),
  add column if not exists mrr numeric,
  add column if not exists engagement_status text
    check (engagement_status in ('pending','active','paused','completed','churned'));

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

create unique index if not exists cycles_project_month_idx
  on cycles (project_id, month_index);

drop trigger if exists cycles_touch_updated_at on cycles;
create trigger cycles_touch_updated_at
  before update on cycles
  for each row execute function kanban_touch_updated_at();

alter table kanban_tasks
  add column if not exists size text
    check (size in ('core','secondary','tertiary','test')),
  add column if not exists cycle_id uuid references cycles(id) on delete set null;

alter table cycles enable row level security;
drop policy if exists cycles_all on cycles;
create policy cycles_all on cycles
  for all to anon, authenticated using (true) with check (true);

-- ── 054_artifacts.sql ──
create table if not exists artifacts (
  id           uuid primary key,
  project_id   text references kanban_projects(id) on delete cascade,
  cycle_id     uuid references cycles(id) on delete set null,
  type         text not null check (type in (
    'growth_plan','todo_list','customer_research','competitor_audit',
    'offer_work','monthly_report','qbr','audit_report','strategy_brief'
  )),
  title        text,
  url          text, -- external link or storage path
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists artifacts_project_idx on artifacts (project_id);
create index if not exists artifacts_cycle_idx on artifacts (cycle_id);

drop trigger if exists artifacts_touch_updated_at on artifacts;
create trigger artifacts_touch_updated_at
  before update on artifacts
  for each row execute function kanban_touch_updated_at();

alter table artifacts enable row level security;
drop policy if exists artifacts_all on artifacts;
create policy artifacts_all on artifacts
  for all to anon, authenticated using (true) with check (true);

-- ── 055_results_engine.sql ──
create table if not exists results_surfaces (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tests (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table results_surfaces enable row level security;
alter table tests            enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'results_surfaces' and policyname = 'results_surfaces_all') then
    create policy results_surfaces_all on results_surfaces for all to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tests' and policyname = 'tests_all') then
    create policy tests_all on tests for all to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- ── 056_kanban_delivery_phases.sql ──
alter table kanban_tasks drop constraint if exists kanban_tasks_phase_check;

alter table kanban_tasks
  add constraint kanban_tasks_phase_check check (
    phase in (
      'tickets',
      'documents',
      'not-started',
      'strategy',
      'design',
      'internal-revisions',
      'external-revisions',
      'development',
      'qa',
      'client-approval',   -- NEW: second client-hold
      'launch',            -- NEW: go-live; fires the seam
      'done',              -- NEW: delivered/live terminal
      'test-backlog',      -- kept (off-board; Results Engine)
      'launch-testing'     -- kept (off-board; Results Engine)
    )
  );

-- ── 057_kanban_phase_schedule.sql ──
alter table public.kanban_tasks
  add column if not exists phase_deadlines jsonb;

comment on column public.kanban_tasks.phase_deadlines is
  'The build schedule, typed by the PM: one ISO date per column, keyed by phase ("design": "2026-07-27"). THE source for when this card is due in any column -- nothing is computed from start_date + turnaround_days anymore. A missing key = undated column = neutral, never late. The card''s overall due date is the "launch" key.';

-- ── 058_client_csm.sql ──
create table if not exists public.client_csm (
  id            text primary key,
  renewal_date  date,
  mrr           numeric,
  items         jsonb not null default '[]'::jsonb,
  start_date    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.client_csm is
  'CSM-owned overlay on the canonical client (kanban_clients), keyed 1:1 by its id. Holds what delivery cannot derive: renewal date, MRR, and the cadence/compliance checklist. Per-client, shared across all of that client''s engagements.';

alter table public.client_csm enable row level security;
drop policy if exists client_csm_all on public.client_csm;
create policy client_csm_all on public.client_csm
  for all to anon, authenticated using (true) with check (true);

drop trigger if exists client_csm_touch_updated_at on public.client_csm;
create trigger client_csm_touch_updated_at
  before update on public.client_csm
  for each row execute function kanban_touch_updated_at();

