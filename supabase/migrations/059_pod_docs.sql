-- 059_pod_docs.sql
-- Pod Projects: the pod-owned delivery workspace. The "Pod 1 Projects" Google
-- Doc rebuilt as structured docs — one per client engagement, grouped by pod,
-- edited like a document (TipTap) with real tables.
--
-- Follows the repo's generic-store pattern (see 055_results_engine / createStore):
-- { id text pk, data jsonb, created_at, updated_at }. The record shape lives in
-- app types (src/lib/pod-projects/types.ts): { podId, title, type, tier?, body,
-- startDate?, ... }. App-layer auth (permissive RLS, launchpad-role cookie), same
-- posture as the other stores.
--
-- Until this is pasted the feature runs localStorage-only (see
-- src/lib/pod-projects/data.ts — reads/writes degrade silently when the table
-- is absent). NOT destructive. Review + back up before pasting into the SQL editor.

create table if not exists pod_docs (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pod_docs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'pod_docs' and policyname = 'pod_docs_all') then
    create policy pod_docs_all on pod_docs for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
