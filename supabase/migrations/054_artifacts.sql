-- 054: artifacts (the off-board "documents" concept from the model)
--
-- Additive, after the token-meter slice (053). Formalises the deliverable
-- artifacts an engagement produces - growth plans, reports, QBRs, research.
-- These live OUTSIDE kanban_tasks on purpose: an artifact NEVER carries a token
-- cost. Keeping them in their own table is the enforcement.
--
-- Follows the kanban convention: text column + CHECK (not a pg enum), and the
-- same open RLS policy the other kanban tables use (hardening deferred).
--
-- Paste into the Supabase SQL editor after 053. Reversible: drop the table.
--
-- NOTE on project_id: the model sketched it as uuid, but kanban_projects.id is
-- `text` (see 030), and a foreign key must match its target's type - so
-- project_id is text. artifacts.id + cycle_id are genuine uuids (cycle_id -> the
-- uuid cycles.id from 053, for the monthly ones: reports, QBRs).

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
